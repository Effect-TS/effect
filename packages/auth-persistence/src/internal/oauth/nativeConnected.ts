import type { CommitJournal, LifecycleHooks, PreparedCommit } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import type { NativeSqlTables, SqlTable } from "../nativeSqlTable.ts"
import { makeConditionalSqlInsert } from "../sessionNativeRecord.ts"
import { exactSqlText, executeSqlChange } from "../sqlChange.ts"
import { cleanupSqlRows } from "../sqlCleanup.ts"
import { CurrentSqlCommit, makeSqlCommitExecutor, SqlBatchCommit } from "../sqlCommit.ts"
import {
  connectedSummary,
  makeOAuthNativeConnectedState,
  type OAuthNativeConnectedMapping,
  validConnectedMetadata
} from "./nativeConnectedState.ts"
import { makeOAuthNativeFlow } from "./nativeFlow.ts"
import { prepareOAuthNative } from "./nativeSignIn.ts"
import { invalidState, oauthIdentityKey, sameIdentity, sameRevision, storage, unavailable } from "./state.ts"

export const makeNativeOAuthConnectedServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeConnectedMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly oauthConnectedPersistence: OAuth.OAuthConnectedPersistence["Service"] },
  OAuth.OAuthUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const conditionalInsert = yield* makeConditionalSqlInsert()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const external = yield* Effect.serviceOption(CurrentSqlCommit)
  const planned = batch !== undefined && Option.isSome(external)
  const state = yield* makeOAuthNativeConnectedState(tables, mapping, batch !== undefined)

  const flow = yield* makeOAuthNativeFlow(
    tables,
    mapping,
    OAuth.OAuthConnectedFlow,
    "connect",
    (value) => value.context.revision.subjectId,
    batch !== undefined
  )

  const { sql, now, grant } = state
  const g = mapping.grant
  const mysql = sql.onDialectOrElse({ mysql: () => true, orElse: () => false })

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) => {
    const work = Effect.provideContext(effect, cryptoServices)

    return batch === undefined
      ? executor.run(work, mode)
      : executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
  }

  const atomic = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "statement"
  ) =>
    planned
      ? run(effect)
      : executor.run(Effect.provideContext(effect, cryptoServices), mode)

  const refreshMiss = Effect.fnUntraced(
    function*<A>(
      key: OAuth.OAuthConnectedGrantKey,
      nativeId: unknown,
      encoded: string,
      required: Fragment,
      upper: number,
      prepare: (
        decision: typeof OAuth.OAuthConnectedRefreshDecision.Type,
        journal: CommitJournal
      ) => PreparedCommit<A>
    ) {
      const rows = yield* sql`select ${grant.column(g.state)} as state,${now} as instant from ${grant.name} where ${
        state.key(key, nativeId)
      } and ${state.exact(g.snapshot, encoded)} and ${required} limit 2`

      if (!(rows.length <= 1)) return yield* invalidState()
      const row = rows[0]

      return yield* prepareOAuthNative(
        row === undefined
          ? { _tag: "Rejected" }
          : row.state === "Refreshing"
          ? { _tag: "Busy" }
          : row.state !== "Active" || Number(row.instant) >= upper
          ? { _tag: "ReauthorizationRequired" }
          : { _tag: "Busy" },
        prepare
      )
    }
  )

  const read = <A, E, R>(effect: Effect.Effect<A, E, R>) => executor.read(Effect.provideContext(effect, cryptoServices))

  const sameConfiguration = (
    left: OAuth.OAuthConnectedConfiguration,
    right: OAuth.OAuthConnectedConfiguration
  ) =>
    storage(OAuth.OAuthConnectedConfiguration).encode(left) ===
      storage(OAuth.OAuthConnectedConfiguration).encode(right)

  const policy = (input: Parameters<typeof mapping.policy.condition>[0]) =>
    tables.expression(mapping.policy.condition(input))

  const present = (
    key: OAuth.OAuthConnectedGrantKey,
    nativeId: unknown,
    encoded: string,
    extra?: Fragment
  ) =>
    sql`exists(select 1 from ${grant.name} where ${state.key(key, nativeId)} and ${state.exact(g.snapshot, encoded)} ${
      extra === undefined ? sql`` : sql`and ${extra}`
    })`

  const referenced = (identityKey: string, nativeId: unknown) =>
    sql.or([
      sql`exists(select 1 from ${grant.name} where ${state.exact(g.identityKey, identityKey)} and ${
        grant.column(g.subjectId)
      } = ${grant.value(g.subjectId, nativeId)})`,
      ...(mapping.revocation.mode === "provider"
        ? (() => {
          const j = mapping.revocation.job
          const job = tables(j.table)

          return [
            sql`exists(select 1 from ${job.name} where ${
              exactSqlText(sql, job.column(j.identityKey), job.value(j.identityKey, identityKey))
            } and ${job.column(j.subjectId)} = ${job.value(j.subjectId, nativeId)})`
          ]
        })()
        : []),
      tables.expression(mapping.otherReferences({ identityKey, subjectId: nativeId }))
    ])

  const service: OAuth.OAuthConnectedPersistence["Service"] = {
    read: (input) =>
      read(
        Effect.suspend(() => state.readJoined(OAuth.snapshotOAuthSync(OAuth.OAuthConnectedReadInput, input)))
      ),
    issue: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const value = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedFlow, input)

          return yield* prepareOAuthNative(
            (yield* flow.issue(value)) ? { _tag: "Issued", flow: value } : { _tag: "Rejected" },
            prepare
          )
        }),
        flow.mysql ? "transaction" : "statement"
      ),
    consume: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const consumed = yield* flow.consume(OAuth.snapshotOAuthSync(OAuth.OAuthConnectedAccess, input))

          return yield* prepareOAuthNative(
            consumed === undefined ? { _tag: "Rejected" } : { _tag: "Consumed", flow: consumed },
            prepare
          )
        }),
        flow.mysql || input.formPostSubject === true ? "transaction" : "statement"
      ),
    settle: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedSettlement, original)
          const token = input.grant.context
          const captured = yield* state.captureSubject(token.subjectId, batch === undefined)

          const revision = input._tag === "Connect" ? input.flow.context.revision : input.credential.revision

          const current = captured === undefined ||
              captured.securityRevision !== revision.securityRevision ||
              revision.subjectId !== token.subjectId
            ? undefined
            : { ...captured, revision }

          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (
            current === undefined ||
            !validConnectedMetadata(token, current.now) ||
            current.now >= token.metadata.useUntilMillis
          ) {
            return yield* rejected()
          }
          const context = input.flow.context

          if (
            token.moduleId !== context.moduleId ||
            token.identity.provider !== context.provider ||
            token.identity.issuer !== context.issuer ||
            current.now >= context.expiresAtMillis ||
            token.metadata.obtainedAtMillis < context.issuedAtMillis
          ) {
            return yield* rejected()
          }
          let authorization: Fragment
          let previous: OAuth.OAuthConnectedTarget | undefined
          let deadline = Math.min(context.expiresAtMillis, token.metadata.useUntilMillis)

          if (input._tag === "Connect") {
            const c = input.flow.context

            if (
              !sameRevision(current.revision, c.revision) ||
              token.grantId !== c.grantId ||
              !sameConfiguration(
                token.configuration,
                OAuth.snapshotOAuthSync(OAuth.OAuthConnectedConfiguration, c)
              )
            ) {
              return yield* rejected()
            }
            deadline = Math.min(deadline, input.authorization.validUntilMillis)
            authorization = policy({
              subjectId: current.nativeId,
              revision: current.revision,
              kind: "action",
              operation: "settle",
              authorization: input.authorization,
              grant: token
            })
            previous = c.reconnect
          } else {
            if (
              mapping.credential === undefined ||
              !sameRevision(current.revision, input.credential.revision) ||
              input.credential.moduleId !== token.moduleId ||
              !sameIdentity(input.credential.identity, token.identity)
            ) {
              return yield* rejected()
            }
            const c = mapping.credential
            const credential = tables(c.table)
            const identityKey = yield* oauthIdentityKey(token.identity)

            authorization = sql.and([
              policy({
                subjectId: current.nativeId,
                revision: current.revision,
                kind: "sign-in",
                credential: input.credential,
                grant: token
              }),
              sql`exists(select 1 from ${credential.name} where ${credential.column(c.subjectId)} = ${
                credential.value(c.subjectId, current.nativeId)
              } and ${
                exactSqlText(sql, credential.column(c.moduleId), credential.value(c.moduleId, token.moduleId))
              } and ${
                exactSqlText(sql, credential.column(c.identityKey), credential.value(c.identityKey, identityKey))
              } and ${
                exactSqlText(
                  sql,
                  credential.column(c.credentialId),
                  credential.value(c.credentialId, input.credential.credentialId)
                )
              } and ${
                exactSqlText(
                  sql,
                  credential.column(c.credentialRevision),
                  credential.value(c.credentialRevision, input.credential.credentialRevision)
                )
              } and ${tables.expression(c.activeCondition)})`
            ])
            previous = input.previous
            const profile = context.access

            if (
              profile === undefined ||
              !sameConfiguration(
                token.configuration,
                OAuth.snapshotOAuthSync(OAuth.OAuthConnectedConfiguration, { ...context, profile })
              )
            ) {
              return yield* rejected()
            }
          }

          const required = sql.and([
            state.authorityCondition(current.nativeId, current.revision),
            authorization,
            sql`${now} < ${deadline}`
          ])

          const key = {
            moduleId: token.moduleId,
            subjectId: token.subjectId,
            grantId: token.grantId
          }

          if (
            previous !== undefined &&
            (previous.grantId !== token.grantId ||
              !sameIdentity(token.identity, previous.identity) ||
              !sameConfiguration(token.configuration, previous.configuration) ||
              token.grantVersion === previous.grantVersion)
          ) {
            return yield* rejected()
          }

          const identityKey = input._tag === "SignIn" || previous !== undefined
            ? yield* oauthIdentityKey(token.identity)
            : yield* state.ensureOwnership(token.identity, current.nativeId)

          if (identityKey === undefined) {
            return yield* prepareOAuthNative({ _tag: "Conflict" }, prepare)
          }
          const owner = sql`exists(select 1 from ${state.ownership.name} where ${
            state.ownerCondition(identityKey, current.nativeId)
          })`
          const values = state.values(input.grant, current.nativeId, identityKey)

          const changed = yield* state.change(
            previous === undefined
              ? yield* conditionalInsert(grant, values, sql`${required} and ${owner}`)
              : sql`${grant.update(values)} where ${state.key(key, current.nativeId)} and ${
                state.exact(g.grantVersion, previous.grantVersion)
              } and ${state.exact(g.identityKey, identityKey)} and ${
                state.exact(g.profileKey, previous.configuration.profile.key)
              } ${
                input._tag === "SignIn" ? sql`and ${state.exact(g.tokenVersion, previous.tokenVersion)}` : sql``
              } and ${required} and ${owner}`
          )

          if (changed !== 1) {
            // A fresh connection may have inserted ownership in this transaction.
            // Roll it back together with a lost grant predicate.
            if (!(input._tag !== "Connect" || previous !== undefined)) return yield* invalidState()

            return yield* rejected()
          }
          if (Option.isSome(external)) {
            yield* state.finish(
              "oauth-connected-grant",
              sql.and([
                required,
                present(
                  key,
                  current.nativeId,
                  state.stored.encode(input.grant),
                  state.exact(g.state, "Active")
                ),
                sql`exists(select 1 from ${state.ownership.name} where ${
                  state.ownerCondition(identityKey, current.nativeId)
                })`
              ])
            )
          }

          return yield* prepareOAuthNative({ _tag: "Connected", grant: input.grant }, prepare)
        })
      ),
    list: (original) =>
      read(
        Effect.gen(function*() {
          const authorization = OAuth.snapshotOAuthSync(
            OAuth.OAuthConnectedUseAuthorization,
            original.authorization
          )

          const input = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedList, {
            limit: original.limit,
            ...(original.cursor === undefined ? {} : { cursor: original.cursor })
          })

          const nativeId = yield* mapping.subjectId.toNative(authorization.revision.subjectId)
          const required = state.use(nativeId, authorization, "metadata")

          if (required === undefined) return { items: [] }

          const rows = yield* sql`select ${grant.column(g.summary)} as summary, ${
            grant.column(g.state)
          } as state from ${grant.name}
        where ${state.exact(g.moduleId, authorization.moduleId)} and ${grant.column(g.subjectId)} = ${
            grant.value(g.subjectId, nativeId)
          } and ${required}
        ${
            input.cursor === undefined
              ? sql``
              : sql`and ${grant.column(g.grantId)} > ${grant.value(g.grantId, input.cursor)}`
          }
        order by ${grant.column(g.grantId)} limit ${input.limit}`

          const items = yield* Effect.forEach(rows, (row) =>
            Effect.gen(function*() {
              if (!(Predicate.isString(row.summary))) return yield* invalidState()

              return OAuth.snapshotOAuthSync(OAuth.OAuthConnectedSummary, {
                ...state.summary.decode(row.summary),
                status: yield* Schema.decodeUnknownEffect(
                  OAuth.OAuthConnectedGrantSnapshot.fields.state
                )(row.state)
              })
            }))

          return {
            items,
            ...(items.length === input.limit ? { cursor: items[items.length - 1]!.grantId } : {})
          }
        })
      ),
    disconnect: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const key = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedGrantKey, original.key)

          const version = OAuth.snapshotOAuthSync(
            OAuth.OAuthConnectedTarget.fields.grantVersion,
            original.grantVersion
          )

          const authorization = OAuth.snapshotOAuthSync(
            OAuth.OAuthConnectedActionAuthorization,
            original.authorization
          )

          const captured = yield* state.captureSubject(key.subjectId, batch === undefined)
          const revision = authorization.challenge.revision

          const current = captured === undefined ||
              revision.subjectId !== key.subjectId ||
              captured.securityRevision !== revision.securityRevision
            ? undefined
            : { ...captured, revision }

          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (
            current === undefined ||
            !sameRevision(current.revision, authorization.challenge.revision)
          ) {
            return yield* rejected()
          }
          const old = yield* state.readGrant(key, current.nativeId, batch === undefined)

          if (old === undefined || old.value.context.grantVersion !== version) {
            return yield* rejected()
          }

          const required = sql.and([
            state.authorityCondition(current.nativeId, current.revision),
            sql`${now} < ${authorization.validUntilMillis}`,
            policy({
              subjectId: current.nativeId,
              revision: current.revision,
              kind: "action",
              operation: "disconnect",
              authorization,
              grant: old.value.context
            })
          ])

          let remoteRevocation: "Pending" | "Unsupported" = "Unsupported"
          const final = []

          // The locked snapshot is also the provider job payload; never enqueue
          // caller ciphertext or delete a different grant revision.
          const removed = yield* state.change(
            sql`delete from ${grant.name} where ${state.key(key, current.nativeId)} and ${
              state.exact(g.grantVersion, version)
            } and ${state.exact(g.snapshot, old.encoded)} and ${required}`
          )

          if (removed !== 1) return yield* rejected()

          if (
            mapping.revocation.mode === "provider" &&
            old.value.context.configuration.profile.revocation === "provider"
          ) {
            const j = mapping.revocation.job
            const job = tables(j.table)

            const jobId = yield* Schema.decodeEffect(OAuth.OAuthClaimId)(
              Base64Url.encode(yield* Context.get(cryptoServices, SecureRandom.SecureRandom).randomBytes(32))
            )

            const retained = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRevocationJob, {
              jobId,
              grant: old.value
            })

            const encoded = storage(OAuth.OAuthConnectedRevocationJob).encode(retained)

            if (
              !(
                Number.isSafeInteger(mapping.revocation.retentionMillis) &&
                mapping.revocation.retentionMillis >= 120000
              )
            ) {
              return yield* invalidState()
            }
            if (
              !(
                (yield* state.change(
                  job.insert({
                    ...j.encodeInsert({ job: retained, subjectId: current.nativeId }),
                    [j.jobId]: jobId,
                    [j.moduleId]: key.moduleId,
                    [j.subjectId]: current.nativeId,
                    [j.identityKey]: old.identityKey,
                    [j.snapshot]: encoded,
                    [j.state]: "Pending",
                    [j.claimId]: null,
                    [j.claimedAt]: null,
                    [j.claimExpiresAt]: null,
                    [j.retentionUntil]: mapping.clock.encodeInstant(
                      current.now + mapping.revocation.retentionMillis
                    )
                  })
                )) === 1
              )
            ) {
              return yield* invalidState()
            }
            final.push(
              sql`exists(select 1 from ${job.name} where ${
                exactSqlText(sql, job.column(j.jobId), job.value(j.jobId, jobId))
              } and ${exactSqlText(sql, job.column(j.snapshot), job.value(j.snapshot, encoded))})`
            )
            remoteRevocation = "Pending"
          }
          yield* state.releaseOwnership(
            old.identityKey,
            current.nativeId,
            referenced(old.identityKey, current.nativeId)
          )
          if (Option.isSome(external)) {
            yield* state.finish(
              "oauth-connected-disconnected",
              sql.and([
                required,
                sql`not exists(select 1 from ${grant.name} where ${state.key(key, current.nativeId)})`,
                ...final
              ])
            )
          }

          return yield* prepareOAuthNative(
            { _tag: "Disconnected", grantId: key.grantId, remoteRevocation },
            prepare
          )
        })
      ),
    claimRefresh: (original, prepare) =>
      atomic(
        Effect.gen(function*() {
          const stored = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedStoredGrant, original.grant)
          const token = stored.context

          const key = {
            moduleId: token.moduleId,
            subjectId: token.subjectId,
            grantId: token.grantId
          }

          const nativeId = yield* mapping.subjectId.toNative(token.subjectId)

          const authorization = OAuth.snapshotOAuthSync(
            OAuth.OAuthConnectedUseAuthorization,
            original.authorization
          )

          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)
          const required = state.use(nativeId, authorization, "use", token)

          if (required === undefined) return yield* rejected()
          if (
            token.configuration.profile.refresh === "unsupported" ||
            token.metadata.refreshUseUntilMillis === undefined
          ) {
            return yield* prepareOAuthNative({ _tag: "ReauthorizationRequired" }, prepare)
          }
          if (
            !(
              Number.isSafeInteger(original.lifetimeMillis) &&
              original.lifetimeMillis >= 1000 &&
              original.lifetimeMillis <= 300000 &&
              original.nextTokenVersion !== token.tokenVersion &&
              validConnectedMetadata(token, token.metadata.obtainedAtMillis)
            )
          ) {
            return yield* invalidState()
          }
          const encoded = state.stored.encode(stored)

          const upper = Math.min(
            token.metadata.refreshUseUntilMillis,
            authorization.expiresAtMillis
          )

          const due = token.metadata.useUntilMillis - token.configuration.profile.refreshAheadMillis

          const base = sql.and([
            state.key(key, nativeId),
            state.exact(g.grantVersion, token.grantVersion),
            state.exact(g.tokenVersion, token.tokenVersion),
            state.exact(g.snapshot, encoded),
            state.exact(g.state, "Active"),
            sql`${grant.column(g.refreshClaimId)} is null`,
            required,
            sql`${now} >= ${token.metadata.obtainedAtMillis} and ${now} >= ${due} and ${now} < ${upper}`
          ])

          let claimedAtMillis: number, claimExpiresAtMillis: number

          if (planned || mysql) {
            // A fixed batch cannot return its future clock sample. Its planned
            // sample is written exactly and guarded by the original horizon.
            const clock = yield* sql`select ${now} as instant`

            claimedAtMillis = Number(clock[0]?.instant)
            if (!Number.isSafeInteger(claimedAtMillis)) return yield* invalidState()
            claimExpiresAtMillis = Math.min(claimedAtMillis + original.lifetimeMillis, upper)
            if (claimedAtMillis >= upper) {
              return yield* prepareOAuthNative({ _tag: "ReauthorizationRequired" }, prepare)
            }
            const statement = sql`${
              grant.update({
                [g.state]: "Refreshing",
                [g.refreshClaimId]: original.claimId,
                [g.refreshNextTokenVersion]: original.nextTokenVersion,
                [g.refreshClaimedAt]: mapping.clock.encodeInstant(claimedAtMillis),
                [g.refreshClaimExpiresAt]: mapping.clock.encodeInstant(claimExpiresAtMillis)
              })
            } where ${base} and ${now} >= ${claimedAtMillis} and ${now} < ${claimExpiresAtMillis}`

            const changed = planned
              ? yield* state.change(statement)
              : yield* executeSqlChange(sql, statement)

            if (changed !== 1) {
              return yield* refreshMiss(key, nativeId, encoded, required, upper, prepare)
            }
          } else {
            const sample = sql`(select instant from refresh_clock)`
            const deadline =
              sql`case when ${sample} + ${original.lifetimeMillis} < ${upper} then ${sample} + ${original.lifetimeMillis} else ${upper} end`
            const statement = sql`with refresh_clock as materialized (select ${now} as instant) ${
              grant.update({
                [g.state]: "Refreshing",
                [g.refreshClaimId]: original.claimId,
                [g.refreshNextTokenVersion]: original.nextTokenVersion,
                [g.refreshClaimedAt]: tables.expression(mapping.clock.fromMillis(sample)),
                [g.refreshClaimExpiresAt]: tables.expression(mapping.clock.fromMillis(deadline))
              })
            } where ${base} and ${sample} >= ${due} and ${sample} >= ${token.metadata.obtainedAtMillis} and ${sample} < ${upper} returning ${
              grant.fields("claimed_")
            }`
            const rows = yield* statement

            if (rows.length === 0) {
              return yield* refreshMiss(key, nativeId, encoded, required, upper, prepare)
            }
            if (!(rows.length === 1)) return yield* invalidState()
            const row = grant.decode(rows[0]!, "claimed_")

            if (
              !(
                row[g.snapshot] === encoded &&
                row[g.refreshClaimId] === original.claimId &&
                row[g.refreshNextTokenVersion] === original.nextTokenVersion
              )
            ) {
              return yield* invalidState()
            }
            claimedAtMillis = mapping.clock.decodeInstant(row[g.refreshClaimedAt])
            claimExpiresAtMillis = mapping.clock.decodeInstant(row[g.refreshClaimExpiresAt])
          }

          const claim = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRefreshClaim, {
            grant: stored,
            claimId: original.claimId,
            nextTokenVersion: original.nextTokenVersion,
            claimedAtMillis,
            claimExpiresAtMillis
          })

          if (Option.isSome(external)) {
            yield* state.finish(
              "oauth-refresh-claim",
              sql.and([
                required,
                sql`${now} < ${claimExpiresAtMillis}`,
                present(
                  key,
                  nativeId,
                  encoded,
                  sql.and([
                    state.exact(g.state, "Refreshing"),
                    state.exact(g.refreshClaimId, claim.claimId),
                    state.exact(g.refreshNextTokenVersion, claim.nextTokenVersion),
                    sql`${
                      tables.expression(mapping.clock.toMillis(grant.column(g.refreshClaimedAt)))
                    } = ${claimedAtMillis}`,
                    sql`${
                      tables.expression(mapping.clock.toMillis(grant.column(g.refreshClaimExpiresAt)))
                    } = ${claimExpiresAtMillis}`
                  ])
                )
              ])
            )
          }

          return yield* prepareOAuthNative({ _tag: "Claimed", claim }, prepare)
        }),
        mysql ? "transaction" : "statement"
      ),
    settleRefresh: (original, prepare) =>
      atomic(
        Effect.gen(function*() {
          const claim = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRefreshClaim, original.claim)

          const authorization = OAuth.snapshotOAuthSync(
            OAuth.OAuthConnectedUseAuthorization,
            original.authorization
          )

          const outcome = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedRefreshOutcome, original.outcome)
          const token = claim.grant.context

          const key = {
            moduleId: token.moduleId,
            subjectId: token.subjectId,
            grantId: token.grantId
          }

          const nativeId = yield* mapping.subjectId.toNative(token.subjectId)
          const required = state.use(nativeId, authorization, "use", token)

          if (required === undefined) {
            return yield* prepareOAuthNative({ _tag: "Rejected" }, prepare)
          }
          let deadline = Math.min(claim.claimExpiresAtMillis, authorization.expiresAtMillis)
          let lower = claim.claimedAtMillis
          let values: Readonly<Record<string, unknown>>
          let encoded = state.stored.encode(claim.grant)

          if (outcome._tag === "Refreshed") {
            const next = outcome.grant.context

            if (
              !(
                next.moduleId === token.moduleId &&
                next.subjectId === token.subjectId &&
                next.grantId === token.grantId &&
                next.grantVersion === token.grantVersion &&
                next.tokenVersion === claim.nextTokenVersion &&
                sameIdentity(next.identity, token.identity) &&
                sameConfiguration(next.configuration, token.configuration) &&
                next.metadata.obtainedAtMillis >= claim.claimedAtMillis &&
                validConnectedMetadata(next, next.metadata.obtainedAtMillis) &&
                (next.metadata.refreshUseUntilMillis === undefined ||
                  (token.metadata.refreshUseUntilMillis !== undefined &&
                    next.metadata.refreshUseUntilMillis <= token.metadata.refreshUseUntilMillis))
              )
            ) {
              return yield* invalidState()
            }
            deadline = Math.min(deadline, next.metadata.useUntilMillis)
            lower = next.metadata.obtainedAtMillis
            values = state.values(outcome.grant, nativeId, yield* oauthIdentityKey(token.identity))
            encoded = state.stored.encode(outcome.grant)
          } else {
            values = {
              [g.state]: "ReauthorizationRequired",
              [g.refreshClaimId]: null,
              [g.refreshNextTokenVersion]: null,
              [g.refreshClaimedAt]: null,
              [g.refreshClaimExpiresAt]: null,
              [g.summary]: state.summary.encode({
                ...connectedSummary(token),
                status: "ReauthorizationRequired"
              })
            }
          }

          const target = sql.and([
            state.key(key, nativeId),
            state.exact(g.grantVersion, token.grantVersion),
            state.exact(g.tokenVersion, token.tokenVersion),
            state.exact(g.snapshot, state.stored.encode(claim.grant)),
            state.exact(g.state, "Refreshing"),
            state.exact(g.refreshClaimId, claim.claimId),
            state.exact(g.refreshNextTokenVersion, claim.nextTokenVersion),
            sql`${
              tables.expression(mapping.clock.toMillis(grant.column(g.refreshClaimedAt)))
            } = ${claim.claimedAtMillis}`,
            sql`${
              tables.expression(mapping.clock.toMillis(grant.column(g.refreshClaimExpiresAt)))
            } = ${claim.claimExpiresAtMillis}`,
            required,
            sql`${now} >= ${lower} and ${now} < ${deadline}`
          ])

          const statement = sql`${grant.update(values)} where ${target}`

          const changed = planned
            ? yield* state.change(statement)
            : yield* executeSqlChange(sql, statement)

          if (changed !== 1) return yield* prepareOAuthNative({ _tag: "Rejected" }, prepare)
          if (Option.isSome(external)) {
            yield* state.finish(
              "oauth-refresh-settled",
              sql.and([
                required,
                sql`${now} < ${deadline}`,
                present(
                  key,
                  nativeId,
                  encoded,
                  state.exact(
                    g.state,
                    outcome._tag === "Refreshed" ? "Active" : "ReauthorizationRequired"
                  )
                )
              ])
            )
          }

          return yield* prepareOAuthNative(outcome, prepare)
        })
      ),
    cleanup: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthCleanupInput, original)
          let removed = 0

          // Expired rows own the public limit. Releasing their now-unreferenced
          // ownership is bounded ancillary teardown in this same commit.
          const candidates: Array<{
            table: SqlTable
            keys: readonly [string, ...Array<string>]
            due: Fragment
            order: ReadonlyArray<Fragment>
            key: Fragment
            identityKey: string
            nativeId: unknown
          }> = []

          if (removed < input.limit) {
            const due = sql.and([
              state.exact(g.moduleId, input.moduleId),
              sql`${tables.expression(mapping.clock.toMillis(grant.column(g.expiresAt)))} <= ${now}`
            ])

            const rows = yield* sql`select ${grant.fields("due_")} from ${grant.name} where ${due} order by ${
              grant.column(g.expiresAt)
            }, ${grant.column(g.grantId)} limit ${input.limit - removed}`

            for (const raw of rows) {
              const row = grant.decode(raw, "due_"),
                nativeId = row[g.subjectId]

              const value = yield* state.decode(row, nativeId)

              candidates.push({
                table: grant,
                keys: [g.moduleId, g.grantId],
                due,
                order: [grant.column(g.expiresAt), grant.column(g.grantId)],
                key: state.key(
                  {
                    moduleId: input.moduleId,
                    subjectId: value.value.context.subjectId,
                    grantId: value.value.context.grantId
                  },
                  nativeId
                ),
                identityKey: value.identityKey,
                nativeId
              })
            }
          }
          if (removed + candidates.length < input.limit && mapping.revocation.mode === "provider") {
            const j = mapping.revocation.job,
              job = tables(j.table)

            const due = sql.and([
              exactSqlText(sql, job.column(j.moduleId), job.value(j.moduleId, input.moduleId)),
              sql`${tables.expression(mapping.clock.toMillis(job.column(j.retentionUntil)))} <= ${now}`
            ])

            const rows = yield* sql`select ${job.fields("job_")} from ${job.name} where ${due} order by ${
              job.column(j.retentionUntil)
            }, ${job.column(j.jobId)} limit ${input.limit - removed - candidates.length}`

            for (const raw of rows) {
              const row = job.decode(raw, "job_")

              candidates.push({
                table: job,
                keys: [j.jobId],
                due,
                order: [job.column(j.retentionUntil), job.column(j.jobId)],
                key: exactSqlText(sql, job.column(j.jobId), job.value(j.jobId, row[j.jobId])),
                identityKey: yield* Schema.decodeUnknownEffect(Schema.String)(row[j.identityKey]),
                nativeId: row[j.subjectId]
              })
            }
          }
          const owners = new Map<string, unknown>()

          for (const candidate of candidates) {
            const logical = yield* mapping.subjectId.toSubject(candidate.nativeId)

            if (
              !mapping.subjectId.equals(
                candidate.nativeId,
                yield* mapping.subjectId.toNative(logical)
              )
            ) {
              return yield* invalidState()
            }
            owners.set(logical, candidate.nativeId)
          }
          // Collect the complete bounded owner set before locking; every cleanup
          // invocation takes these subject locks in the same physical order.
          if (
            owners.size > 0 &&
            batch === undefined &&
            !sql.onDialectOrElse({ sqlite: () => true, orElse: () => false })
          ) {
            const s = mapping.subject,
              subject = state.subject

            yield* sql`select ${subject.column(s.id)} from ${subject.name} where ${
              sql.or([...owners.values()].map((nativeId) =>
                sql`${subject.column(s.id)} = ${subject.value(s.id, nativeId)}`
              ))
            } order by ${subject.column(s.id)} for update`
          }
          // Small fixed groups bound driver parameters even for codecs and
          // application reference predicates. No cleanup statement is per row.
          for (let start = 0; start < candidates.length;) {
            const first = candidates[start]!

            const selected = candidates
              .slice(start, start + 8)
              .filter((candidate) => candidate.table === first.table)

            start += selected.length

            const result = yield* cleanupSqlRows(
              [
                {
                  table: first.table,
                  keys: first.keys,
                  due: sql.and([first.due, sql.or(selected.map((candidate) => candidate.key))]),
                  order: first.order
                }
              ],
              selected.length,
              batch !== undefined
            )

            removed += result.removed

            const release = sql.or(
              selected.map((candidate) =>
                sql.and([
                  state.ownerCondition(candidate.identityKey, candidate.nativeId),
                  sql`not (${referenced(candidate.identityKey, candidate.nativeId)})`
                ])
              )
            )

            yield* state.execute(sql`delete from ${state.ownership.name} where ${release}`)
          }

          if (removed < input.limit) {
            removed += (yield* flow.cleanup(input.moduleId, input.limit - removed)).removed
          }

          return yield* prepareOAuthNative({ removed, hasMore: removed === input.limit }, prepare)
        })
      )
  }

  return { oauthConnectedPersistence: service }
})

import type { LifecycleHooks } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import { SessionInvalidationWindow } from "@effect/auth/Sessions"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { type OAuthAccountsMapping, OAuthEligibilityFact } from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { makeConditionalSqlInsert } from "../sessionNativeRecord.ts"
import { anySqlCondition, exactSqlText, sqlTextBytes } from "../sqlChange.ts"
import { CurrentSqlCommit, makeSqlCommitExecutor, SqlBatchCommit } from "../sqlCommit.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { makeOAuthNativeFlow } from "./nativeFlow.ts"
import { makeOAuthNativeMutation } from "./nativeMutation.ts"
import { prepareOAuthNative } from "./nativeSignIn.ts"
import { decodeOAuthRequirement, makeOAuthNativeState } from "./nativeState.ts"
import { invalidState, oauthIdentityKey, sameRevision, satisfies, unavailable } from "./state.ts"

// Physical metadata is validated by the adapter; schema values remain typed.
export type OAuthNativeAccountsMapping = OAuthAccountsMapping<
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  SqlExpression
>

export const makeNativeOAuthAccountsServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeAccountsMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly oauthAccountsPersistence: OAuth.OAuthAccountsPersistence["Service"] },
  OAuth.OAuthUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const conditionalInsert = yield* makeConditionalSqlInsert()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const external = yield* Effect.serviceOption(CurrentSqlCommit)
  const state = yield* makeOAuthNativeState(tables, mapping)
  const mutation = yield* makeOAuthNativeMutation(tables, mapping, batch !== undefined)

  const flow = yield* makeOAuthNativeFlow(
    tables,
    mapping,
    OAuth.OAuthLinkFlow,
    "link",
    (value) => value.context.revision.subjectId,
    batch !== undefined
  )

  const { sql, now, credential, authority } = state

  const c = mapping.credential
  const a = mapping.authority

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) => {
    const work = Effect.provideContext(effect, cryptoServices)

    return batch === undefined
      ? executor.run(work, mode)
      : executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
  }

  const read = <A, E, R>(effect: Effect.Effect<A, E, R>) => executor.read(Effect.provideContext(effect, cryptoServices))

  const credentialCondition = (nativeId: unknown, key: string, id: string, revision: unknown) =>
    sql.and([
      sql`${credential.column(c.subjectId)} = ${credential.value(c.subjectId, nativeId)}`,
      exactSqlText(sql, credential.column(c.identityKey), credential.value(c.identityKey, key)),
      exactSqlText(sql, credential.column(c.credentialId), credential.value(c.credentialId, id)),
      exactSqlText(
        sql,
        credential.column(c.credentialRevision),
        credential.value(c.credentialRevision, revision)
      ),
      tables.expression(c.activeCondition)
    ])

  const service: OAuth.OAuthAccountsPersistence["Service"] = {
    list: (original) =>
      read(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthLinkedAccountsRead, original)
          const nativeId = yield* mapping.subjectId.toNative(input.invocation.subjectId)

          const metadataAccess = tables.expression(
            mapping.metadataAccess({
              invocation: input.invocation,
              moduleId: input.moduleId,
              subjectId: nativeId
            })
          )

          const s = mapping.subject
          const orderedId = yield* sqlTextBytes(credential.column(c.credentialId))

          const cursorCondition = input.cursor === undefined
            ? sql``
            : sql`and ${orderedId} > ${yield* sqlTextBytes(credential.value(c.credentialId, input.cursor))}`

          // Bound candidate work before resolving identities. Each final read uses
          // its columns' own codecs and rechecks live ownership/authority/policy.
          // A removed candidate can leave a short page; the cursor still advances.
          // Match exact credential identity even when the column's collation does not.
          const rows = yield* sql`select ${credential.fields("page_")} from ${credential.name}
            where ${exactSqlText(sql, credential.column(c.moduleId), credential.value(c.moduleId, input.moduleId))}
              and ${credential.column(c.subjectId)} = ${credential.value(c.subjectId, nativeId)}
              and ${tables.expression(c.activeCondition)} and ${metadataAccess}
              and exists(select 1 from ${state.subject.name}
                where ${state.subject.column(s.id)} = ${state.subject.value(s.id, nativeId)}
                  and ${tables.expression(s.activeCondition)})
              ${cursorCondition}
            order by ${orderedId} limit ${input.limit + 1}`

          const selected = rows.slice(0, input.limit)
          const items: Array<OAuth.OAuthLinkedAccount> = []
          let cursor: string | undefined

          for (const row of selected) {
            const credentialId = yield* Schema.decodeUnknownEffect(
              OAuth.OAuthLinkedAccount.fields.credentialId
            )(credential.decode(row, "page_")[c.credentialId])

            cursor = credentialId

            const current = yield* state.readCredential(
              {
                moduleId: input.moduleId,
                subjectId: input.invocation.subjectId,
                credentialId
              },
              metadataAccess
            )

            if (current !== undefined) {
              items.push(
                OAuth.OAuthLinkedAccount.make({
                  credentialId: current.credentialId,
                  ...current.identity
                })
              )
            }
          }

          return OAuth.snapshotOAuthSync(OAuth.OAuthLinkedAccountsListResult, {
            items,
            ...(rows.length > input.limit && cursor !== undefined ? { cursor } : {})
          })
        })
      ),
    capture: (input) => read(Effect.map(state.capture(input.subjectId, false), (current) => current?.revision)),
    issue: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthLinkFlow, original)
          // Flow issue has no protected authority mutation; completion owns the one
          // subject-first recheck of this authenticated begin authorization.
          const issued = yield* flow.issue(input)

          return yield* prepareOAuthNative(
            issued ? { _tag: "Issued", flow: input } : { _tag: "Rejected" },
            prepare
          )
        }),
        flow.mysql ? "transaction" : "statement"
      ),
    consume: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthLinkAccess, original)
          const consumed = yield* flow.consume(input)

          return yield* prepareOAuthNative(
            consumed === undefined ? { _tag: "Rejected" } : { _tag: "Consumed", flow: consumed },
            prepare
          )
        }),
        flow.mysql || original.formPostSubject === true ? "transaction" : "statement"
      ),
    link: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const flow = OAuth.snapshotOAuthSync(OAuth.OAuthLinkFlow, original.flow)
          const verified = OAuth.snapshotOAuthSync(OAuth.OAuthVerifiedExternalIdentity, original.identity)
          const context = flow.context

          const current = yield* mutation.capture(context.revision.subjectId, batch === undefined)
          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (
            current === undefined ||
            !sameRevision(context.revision, current.revision) ||
            context.provider !== verified.identity.provider ||
            context.issuer !== verified.identity.issuer ||
            current.now >= context.expiresAtMillis
          ) {
            return yield* rejected()
          }

          const deadline = Math.min(
            context.expiresAtMillis,
            context.authorization.validUntilMillis
          )

          const before = sql.and([
            mutation.authorityCondition(current.nativeId, current.revision),
            sql`${now} < ${deadline}`
          ])

          if (batch !== undefined) yield* mutation.assert(before)
          const identityKey = yield* mutation.ensureOwnership(verified.identity, current.nativeId)

          if (identityKey === undefined) {
            return yield* prepareOAuthNative({ _tag: "Conflict" }, prepare)
          }

          const identityCondition = exactSqlText(
            sql,
            credential.column(c.identityKey),
            credential.value(c.identityKey, identityKey)
          )

          // Fixed D1 plans classify an existing login before staging writes. Native
          // owners attempt the unique insert and read only its conflict outcome.
          const existing = batch === undefined
            ? []
            : yield* sql`select ${
              credential.fields("login_")
            } from ${credential.name} where ${identityCondition} and ${before}`

          if (!(existing.length <= 1)) return yield* invalidState()
          let credentialId = yield* mapping.allocateCredentialId
          let credentialRevision = yield* mapping.allocateRevision
          let changed = false
          let revision = current.revision

          if (existing.length === 0) {
            const values = {
              ...c.encodeInsert({
                moduleId: context.moduleId,
                subjectId: current.nativeId,
                identityKey,
                credentialId,
                credentialRevision
              }),
              [c.moduleId]: context.moduleId,
              [c.subjectId]: current.nativeId,
              [c.identityKey]: identityKey,
              [c.credentialId]: credentialId,
              [c.credentialRevision]: credentialRevision
            }

            if (!c.isActiveStatus(values[c.status])) return yield* invalidState()

            const inserted = yield* mutation.insertUnique(
              sql`${yield* conditionalInsert(credential, values, before)} ${
                sql.onDialectOrElse({ mysql: () => sql``, orElse: () => sql`on conflict do nothing` })
              }`
            )

            changed = inserted === 1
          }
          if (changed) {
            const factor = {
              ...a.encodeInsert({
                subjectId: current.nativeId,
                credentialId,
                revision: credentialRevision
              }),
              [a.subjectId]: current.nativeId,
              [a.credentialId]: credentialId,
              [a.revision]: credentialRevision
            }

            if (!a.isActiveStatus(factor[a.status])) return yield* invalidState()
            if (
              !(
                (yield* mutation.change(
                  yield* conditionalInsert(
                    authority,
                    factor,
                    sql.and([
                      before,
                      sql`exists(select 1 from ${credential.name} where ${
                        credentialCondition(current.nativeId, identityKey, credentialId, credentialRevision)
                      })`
                    ])
                  )
                )) === 1
              )
            ) {
              return yield* invalidState()
            }
            revision = {
              ...current.revision,
              credentials: [
                ...current.revision.credentials,
                { credentialId, revision: credentialRevision }
              ].sort((left, right) => left.credentialId.localeCompare(right.credentialId))
            }
          } else {
            const rows = existing.length === 1
              ? existing
              : yield* sql`select ${
                credential.fields("login_")
              } from ${credential.name} where ${identityCondition} and ${before}`

            if (!(rows.length === 1)) return yield* invalidState()
            const row = credential.decode(rows[0]!, "login_")

            if (
              !(
                mapping.subjectId.equals(row[c.subjectId], current.nativeId) &&
                row[c.moduleId] === context.moduleId &&
                c.isActiveStatus(row[c.status])
              )
            ) {
              return yield* invalidState()
            }
            credentialId = yield* Schema.decodeUnknownEffect(
              OAuth.OAuthCredentialSnapshot.fields.credentialId
            )(row[c.credentialId])
            credentialRevision = yield* Schema.decodeUnknownEffect(
              OAuth.OAuthCredentialSnapshot.fields.credentialRevision
            )(row[c.credentialRevision])
            if (
              !revision.credentials.some(
                (entry) => entry.credentialId === credentialId && entry.revision === credentialRevision
              )
            ) {
              return yield* invalidState()
            }
          }
          if (Option.isSome(external)) {
            yield* mutation.finish(
              "oauth-link-authority",
              sql.and([
                mutation.authorityCondition(current.nativeId, revision),
                sql`${now} < ${deadline}`,
                sql`exists(select 1 from ${credential.name} where ${
                  credentialCondition(current.nativeId, identityKey, credentialId, credentialRevision)
                })`,
                sql`exists(select 1 from ${mutation.ownership.name} where ${
                  mutation.ownerCondition(identityKey, current.nativeId)
                })`
              ])
            )
          }

          const result = yield* Schema.decodeEffect(Schema.toType(OAuth.OAuthCredentialSnapshot))({
            moduleId: context.moduleId,
            identity: verified.identity,
            credentialId,
            credentialRevision,
            revision,
            requirement: yield* decodeOAuthRequirement(mapping.subject, current.subject)
          })

          return yield* prepareOAuthNative(
            { _tag: "Linked", credential: result, changed },
            prepare
          )
        })
      ),
    readCredential: (original) =>
      read(
        Effect.suspend(() => state.readCredential(OAuth.snapshotOAuthSync(OAuth.OAuthCredentialKey, original)))
      ),
    unlink: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const captured = OAuth.snapshotOAuthSync(OAuth.OAuthCredentialSnapshot, original.credential)

          const authorization = OAuth.snapshotOAuthSync(
            OAuth.OAuthActionAuthorization,
            original.authorization
          )

          const invalidation = OAuth.snapshotOAuthSync(
            SessionInvalidationWindow,
            original.invalidation
          )

          if (
            !(
              invalidation.trigger === "credential-change" &&
              invalidation.oldAuthenticationEvidence === "rejected" &&
              (mapping.sessionInvalidation === "same-authority-immediate"
                ? (invalidation.existingSessions === "immediate" &&
                  invalidation.maximumExposureMillis === 0) ||
                  (invalidation.existingSessions === "cache-expiry" &&
                    invalidation.maximumExposureMillis > 0)
                : invalidation.existingSessions === "original-absolute-expiry")
            )
          ) {
            return yield* invalidState()
          }

          const current = yield* mutation.capture(captured.revision.subjectId, batch === undefined)
          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (current === undefined || !sameRevision(current.revision, captured.revision)) {
            return yield* rejected()
          }

          const key = yield* oauthIdentityKey(captured.identity)

          const target = credentialCondition(
            current.nativeId,
            key,
            captured.credentialId,
            captured.credentialRevision
          )

          const eligible = new Map<
            string,
            { readonly fact: OAuthEligibilityFact; readonly conditions: Array<Fragment> }
          >()

          if (!(mapping.eligibility.length <= 32)) return yield* invalidState()

          const sources = mapping.eligibility.map((source) => ({
            source,
            table: tables(source.table)
          }))

          // Each branch owns distinct projection columns. Empty scalar subqueries
          // retain each physical SQL type across derived SELECT and UNION coercion.
          if (!(sources.reduce((count, entry) => count + entry.table.keys.length, 0) <= 1024)) {
            return yield* invalidState()
          }

          const branches = sources.map(({ source, table }, branch) => {
            const fields = sources.flatMap((entry, index) =>
              entry.table.keys.map(
                (key, ordinal) =>
                  sql`${
                    index === branch
                      ? table.selectedColumn(key)
                      : sql`(select ${entry.table.selectedColumn(key)} from ${entry.table.name} where 1 = 0)`
                  } as ${sql(`method_${index}_${ordinal}`)}`
              )
            )

            // The bounded array ordinal is an integer SQL literal, matching the sentinel.
            return sql`select * from (select ${sql.literal(String(branch))} as method_branch, 1 as target_present, ${
              sql.join(", ", false)(fields)
            } from ${table.name}
              where ${table.column(source.subjectId)} = ${table.value(source.subjectId, current.nativeId)} and ${
              tables.expression(source.condition(current.nativeId))
            }
              order by ${table.column(source.credentialId)} limit 65) as ${sql(`eligible_${branch}`)}`
          })

          const allowed = sql.and([
            mutation.authorityCondition(current.nativeId, current.revision),
            sql`exists(select 1 from ${credential.name} where ${target} and ${
              exactSqlText(sql, credential.column(c.moduleId), credential.value(c.moduleId, captured.moduleId))
            })`
          ])

          const empty = sources.flatMap((entry, index) =>
            entry.table.keys.map(
              (key, ordinal) =>
                sql`(select ${entry.table.selectedColumn(key)} from ${entry.table.name} where 1 = 0) as ${
                  sql(`method_${index}_${ordinal}`)
                }`
            )
          )

          const sentinel = sql`select -1 as method_branch, case when ${allowed} then 1 else 0 end as target_present ${
            empty.length === 0 ? sql`` : sql`, ${sql.join(", ", false)(empty)}`
          }`
          const candidates = yield* sql`${sql.join(" union all ", false)([sentinel, ...branches])}`
          const presence = candidates.find((row) => Number(row.method_branch) === -1)

          if (!(presence !== undefined)) return yield* invalidState()
          if (Number(presence.target_present) !== 1) return yield* rejected()

          const counts = new Map<number, number>()

          for (const row of candidates) {
            const branch = yield* Schema.decodeEffect(Schema.Int)(Number(row.method_branch))

            if (branch === -1) continue
            const entry = sources[branch]

            if (!(entry !== undefined)) return yield* invalidState()
            const count = (counts.get(branch) ?? 0) + 1

            if (!(count <= 64)) return yield* invalidState()
            counts.set(branch, count)
            const { source, table } = entry
            const decoded = source.decode(table.decode(row, `method_${branch}_`))

            if (decoded === undefined) continue
            const parsed = yield* Schema.decodeEffect(OAuthEligibilityFact)(decoded)
            const fact = { ...parsed, factors: [...new Set(parsed.factors)].sort() }

            if (
              fact.credentialId !== captured.credentialId &&
              current.revision.credentials.some(
                (item) => item.credentialId === fact.credentialId && item.revision === fact.revision
              )
            ) {
              const condition = sql`exists(select 1 from ${table.name} where
                  ${table.column(source.subjectId)} = ${table.value(source.subjectId, current.nativeId)}
                  and ${
                exactSqlText(
                  sql,
                  table.column(source.credentialId),
                  table.value(source.credentialId, fact.credentialId)
                )
              }
                  and ${exactSqlText(sql, table.column(source.revision), table.value(source.revision, fact.revision))}
                  and ${tables.expression(source.condition(current.nativeId))})`

              const previous = eligible.get(fact.credentialId)

              if (previous === undefined) {
                eligible.set(fact.credentialId, { fact, conditions: [condition] })
              } else {
                const encode = Schema.encodeEffect(
                  Schema.fromJsonString(Schema.toCodecJson(OAuthEligibilityFact))
                )

                if (!((yield* encode(previous.fact)) === (yield* encode(fact)))) {
                  return yield* invalidState()
                }
                previous.conditions.push(condition)
              }
            }
          }
          const methods = [...eligible.values()]
          const facts = methods.map((entry) => entry.fact)
          const requirement = yield* decodeOAuthRequirement(mapping.subject, current.subject)

          if (!facts.some((fact) => fact.usablePrimary) || !satisfies(facts, requirement)) {
            return yield* prepareOAuthNative({ _tag: "LastSignInMethod" }, prepare)
          }

          const present = (entry: (typeof methods)[number]) => anySqlCondition(entry.conditions)

          // Preserve a usable remaining method through application work. These
          // predicates describe eligible credential identities, not observed rows.
          const remaining = sql.and([
            anySqlCondition(methods.filter((entry) => entry.fact.usablePrimary).map(present)),
            anySqlCondition(
              requirement.alternatives.map((alternative) =>
                sql.and([
                  ...alternative.factors.map((factor) =>
                    anySqlCondition(
                      methods.filter((entry) => entry.fact.factors.includes(factor)).map(present)
                    )
                  ),
                  sql`(${
                    sql.join(" + ", false)(methods.map((entry) => sql`case when ${present(entry)} then 1 else 0 end`))
                  }) >= ${alternative.minimumCredentials}`,
                  anySqlCondition(
                    methods
                      .filter(
                        (entry) =>
                          (!alternative.userVerified || entry.fact.userVerified) &&
                          (!alternative.phishingResistant || entry.fact.phishingResistant)
                      )
                      .map(present)
                  )
                ])
              )
            )
          ])

          const required = sql.and([
            mutation.subjectCondition(current.nativeId, current.revision),
            mutation.factorCondition(current.nativeId, current.revision),
            sql`${now} < ${authorization.validUntilMillis}`,
            remaining
          ])

          if (batch !== undefined) {
            yield* mutation.assert(
              sql.and([
                mutation.authorityCondition(current.nativeId, current.revision),
                sql`${now} < ${authorization.validUntilMillis}`,
                remaining
              ])
            )
          }

          const nextSecurityRevision = mapping.subject.nextSecurityRevision(
            current.revision.securityRevision
          )

          if (!(nextSecurityRevision !== current.revision.securityRevision)) {
            return yield* invalidState()
          }
          const subject = mutation.subject

          if (
            !(
              (yield* mutation.change(
                sql`${subject.update({ [mapping.subject.securityRevision]: nextSecurityRevision })}
        where ${subject.column(mapping.subject.id)} = ${
                  subject.value(mapping.subject.id, current.nativeId)
                } and ${required}`
              )) ===
                1
            )
          ) {
            return yield* invalidState()
          }
          if (
            !((yield* mutation.change(sql`delete from ${credential.name} where ${target}`)) === 1)
          ) {
            return yield* invalidState()
          }
          if (
            !(
              (yield* mutation.change(sql`delete from ${authority.name}
        where ${authority.column(a.subjectId)} = ${authority.value(a.subjectId, current.nativeId)}
          and ${
                exactSqlText(
                  sql,
                  authority.column(a.credentialId),
                  authority.value(a.credentialId, captured.credentialId)
                )
              }
          and ${
                exactSqlText(
                  sql,
                  authority.column(a.revision),
                  authority.value(a.revision, captured.credentialRevision)
                )
              }`)) ===
                1
            )
          ) {
            return yield* invalidState()
          }

          const cleanup = {
            subjectId: current.nativeId,
            revision: current.revision,
            removedCredentialId: captured.credentialId
          }

          if (!(mapping.cleanup.length <= 32)) return yield* invalidState()
          const absent = []

          for (const source of mapping.cleanup) {
            const table = tables(source.table)

            const condition = sql.and([
              sql`${table.column(source.subjectId)} = ${table.value(source.subjectId, current.nativeId)}`,
              tables.expression(source.condition(cleanup))
            ])

            const deletion = sql`delete from ${table.name} where ${condition}`

            // Deleting zero or many subject-scoped session/pending rows is valid.
            absent.push(sql`not exists(select 1 from ${table.name} where ${condition})`)
            yield* mutation.execute(deletion)
          }

          const referenced = sql.or([
            sql`exists(select 1 from ${credential.name} where ${
              exactSqlText(sql, credential.column(c.identityKey), credential.value(c.identityKey, key))
            })`,
            tables.expression(
              mapping.otherReferences({ identityKey: key, subjectId: current.nativeId })
            )
          ])

          yield* mutation.releaseOwnership(key, current.nativeId, referenced)

          const revision = {
            ...current.revision,
            securityRevision: nextSecurityRevision,
            credentials: current.revision.credentials.filter(
              (item) => item.credentialId !== captured.credentialId
            )
          }

          yield* mutation.finish(
            "oauth-unlink-authority",
            sql.and([
              mutation.authorityCondition(current.nativeId, revision),
              sql`${now} < ${authorization.validUntilMillis}`,
              remaining,
              sql`not exists(select 1 from ${credential.name} where ${target})`,
              ...absent
            ])
          )

          return yield* prepareOAuthNative(
            {
              _tag: "Unlinked",
              result: { _tag: "Unlinked", credentialId: captured.credentialId, invalidation }
            },
            prepare
          )
        })
      ),
    cleanup: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthCleanupInput, original)

          return yield* prepareOAuthNative(
            yield* flow.cleanup(input.moduleId, input.limit),
            prepare
          )
        }),
        "statement"
      )
  }

  return { oauthAccountsPersistence: service }
})

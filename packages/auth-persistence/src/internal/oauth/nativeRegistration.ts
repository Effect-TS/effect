import type { LifecycleHooks } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "../d1Planning.ts"
import { PersistenceMappingError } from "../mappingError.ts"
import type {
  OAuthRegistrationAuthority,
  OAuthRegistrationIntentMapping,
  OAuthRegistrationMapping
} from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { makeConditionalSqlInsert } from "../sessionNativeRecord.ts"
import { exactSqlText, executeSqlChange } from "../sqlChange.ts"
import { cleanupSqlRows } from "../sqlCleanup.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "../sqlCommit.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { makeOAuthNativeMutation } from "./nativeMutation.ts"
import { prepareOAuthNative } from "./nativeSignIn.ts"
import { invalidState, oauthIdentityKey, storage, unavailable } from "./state.ts"

// Physical metadata is validated at the driver boundary.
export type OAuthNativeRegistrationIntentMapping = OAuthRegistrationIntentMapping<
  TableModel,
  TableModel,
  unknown,
  SqlExpression
>

export type OAuthNativeRegistrationMapping<Registration> = OAuthRegistrationMapping<
  Registration,
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  SqlExpression
>

const makeIntent = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: Pick<OAuthNativeRegistrationIntentMapping, "intent" | "clock" | "ownership">,
  batch: boolean
) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const intent = tables(mapping.intent.table)
  const ownership = tables(mapping.ownership.table)
  const i = mapping.intent
  const o = mapping.ownership
  const stored = storage(OAuth.OAuthRegistrationInspection)
  const intentStored = storage(OAuth.OAuthRegistrationIntent)
  const now = tables.expression(mapping.clock.engineNowMillis)

  const exact = (key: string, value: unknown) => exactSqlText(sql, intent.column(key), intent.value(key, value))

  const key = (moduleId: string, reference: string) =>
    sql.and([exact(i.moduleId, moduleId), exact(i.reference, reference)])

  const horizon = (value: OAuth.OAuthRegistrationIntent) =>
    sql`${now} >= ${value.issuedAtMillis} and ${now} < ${value.expiresAtMillis}`

  const unowned = (identityKey: string) =>
    sql`not exists(select 1 from ${ownership.name} where ${
      exactSqlText(sql, ownership.column(o.identityKey), ownership.value(o.identityKey, identityKey))
    })`

  const read = Effect.fnUntraced(function*(access: OAuth.OAuthRegistrationAccess) {
    const rows = yield* sql`select ${intent.fields("intent_")}, ${now} as engine_now from ${intent.name} where ${
      key(access.moduleId, access.reference)
    }`

    if (!(rows.length <= 1)) return yield* invalidState()
    if (rows[0] === undefined) return undefined
    const row = intent.decode(rows[0], "intent_")
    const encoded = row[i.snapshot]

    if (!(Predicate.isString(encoded))) return yield* invalidState()
    const inspection = stored.decode(encoded)
    const value = inspection.intent
    const context = value.context
    const identityKey = yield* oauthIdentityKey(value.identity)

    if (
      !(
        row[i.moduleId] === context.moduleId &&
        row[i.reference] === value.reference &&
        row[i.flowId] === context.flowId &&
        row[i.identityKey] === identityKey &&
        mapping.clock.decodeInstant(row[i.expiresAt]) === value.expiresAtMillis &&
        mapping.clock.decodeInstant(row[i.retentionUntil]) === value.retentionUntilMillis
      )
    ) {
      return yield* invalidState()
    }
    const engineNow = yield* Schema.decodeEffect(Schema.Int)(Number(rows[0].engine_now))

    if (
      access.moduleId !== context.moduleId ||
      access.flowId !== context.flowId ||
      access.reference !== value.reference ||
      access.requestBindingVerifier !== context.requestBindingVerifier ||
      access.requestBindingExpiresAtMillis !== context.requestBindingExpiresAtMillis ||
      access.credentialDigest !== value.credentialDigest ||
      engineNow < value.issuedAtMillis ||
      // A bound decision stays replayable through retention after the intent expires.
      engineNow >=
        (inspection.application._tag === "Unbound"
          ? value.expiresAtMillis
          : value.retentionUntilMillis)
    ) {
      return undefined
    }

    return { inspection, encoded, identityKey, engineNow }
  })

  const finish = (name: string, condition: Fragment) =>
    batch
      ? registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
      : registerSqlPostcondition({
        name,
        check: Effect.gen(function*() {
          if (!((yield* sql`select 1 where ${condition}`).length === 1)) {
            return yield* PersistenceMappingError.make({
              operation: "postcondition",
              cause: invalidState()
            })
          }
        })
      })

  const change = Effect.fnUntraced(function*(statement: Fragment) {
    if (batch) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    } else {
      if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
    }
  })

  const cleanup = (moduleId: string, limit: number) =>
    cleanupSqlRows(
      [
        {
          table: intent,
          keys: [i.moduleId, i.reference],
          due: sql`${exact(i.moduleId, moduleId)} and ${
            tables.expression(mapping.clock.toMillis(intent.column(i.retentionUntil)))
          } <= ${now}`,
          order: [intent.column(i.retentionUntil), intent.column(i.reference)]
        }
      ],
      limit,
      batch
    )

  return {
    sql,
    now,
    intent,
    stored,
    intentStored,
    exact,
    key,
    horizon,
    unowned,
    read,
    finish,
    change,
    cleanup
  }
})

export const makeNativeOAuthRegistrationIntentServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeRegistrationIntentMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly oauthRegistrationIntents: OAuth.OAuthRegistrationIntents["Service"] },
  OAuth.OAuthUnavailable,
  SqlClient.SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const conditionalInsert = yield* makeConditionalSqlInsert()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const external = yield* Effect.serviceOption(CurrentSqlCommit)
  const state = yield* makeIntent(tables, mapping, batch !== undefined)
  const { sql, intent, unowned, horizon, stored } = state
  const i = mapping.intent

  const run = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    const work = Effect.provideContext(effect, cryptoServices)

    return batch === undefined
      ? executor.run(work, "statement")
      : executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
  }

  const service: OAuth.OAuthRegistrationIntents["Service"] = {
    issue: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const value = OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationIntent, original.intent)
          const context = value.context
          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (
            value.identity.provider !== context.provider ||
            value.identity.issuer !== context.issuer ||
            value.issuedAtMillis < context.issuedAtMillis ||
            value.verifiedAtMillis > value.issuedAtMillis ||
            value.issuedAtMillis >= value.expiresAtMillis ||
            value.expiresAtMillis > context.requestBindingExpiresAtMillis ||
            value.retentionUntilMillis < value.expiresAtMillis
          ) {
            return yield* rejected()
          }
          const identityKey = yield* oauthIdentityKey(value.identity)

          const eligible = sql.and([
            unowned(identityKey),
            horizon(value),
            tables.expression(mapping.eligible(value))
          ])

          const snapshot = stored.encode({ intent: value, application: { _tag: "Unbound" } })

          const values = {
            ...i.encodeInsert(value),
            [i.moduleId]: context.moduleId,
            [i.reference]: value.reference,
            [i.flowId]: context.flowId,
            [i.identityKey]: identityKey,
            [i.snapshot]: snapshot,
            [i.expiresAt]: mapping.clock.encodeInstant(value.expiresAtMillis),
            [i.retentionUntil]: mapping.clock.encodeInstant(value.retentionUntilMillis)
          }

          const statement = yield* conditionalInsert(intent, values, eligible)

          if (batch !== undefined) {
            // D1 classifies eligibility before staging, as the row count does for
            // interactive owners; the batch still asserts the conditional insert.
            if ((yield* sql`select 1 where ${eligible}`).length === 0) return yield* rejected()
            yield* state.change(statement)
          } else if ((yield* executeSqlChange(sql, statement)) !== 1) return yield* rejected()
          if (Option.isSome(external)) {
            yield* state.finish(
              "oauth-registration-intent-issued",
              sql.and([
                eligible,
                sql`exists(select 1 from ${intent.name} where ${state.key(context.moduleId, value.reference)} and ${
                  state.exact(i.snapshot, snapshot)
                })`
              ])
            )
          }

          return yield* prepareOAuthNative({ _tag: "RegistrationIssued", intent: value }, prepare)
        })
      )
  }

  return { oauthRegistrationIntents: service }
})

export const makeNativeOAuthRegistrationServices = Effect.fnUntraced(function*<Registration>(
  tables: NativeSqlTables,
  mapping: OAuthNativeRegistrationMapping<Registration>,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly registrationAuthority: OAuthRegistrationAuthority<Registration> },
  OAuth.OAuthUnavailable,
  SqlClient.SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const conditionalInsert = yield* makeConditionalSqlInsert()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const external = yield* Effect.serviceOption(CurrentSqlCommit)
  const state = yield* makeIntent(tables, mapping, batch !== undefined)
  const mutation = yield* makeOAuthNativeMutation(tables, mapping, batch !== undefined)
  const { sql, now, intent, horizon, stored } = state
  const i = mapping.intent
  const c = mapping.credential
  const a = mapping.authority
  const s = mapping.subject
  const credential = tables(c.table)
  const authority = tables(a.table)
  const subject = tables(s.table)
  const application = Schema.fromJsonString(mapping.registration)

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

  const service: OAuthRegistrationAuthority<Registration> = {
    authentication: "first-confirmed-registration",
    read: (access) =>
      read(
        Effect.map(
          state.read(OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationAccess, access)),
          (value) => value?.inspection
        )
      ),
    inspect: (input) =>
      read(
        Effect.gen(function*() {
          const payload = yield* Schema.encodeEffect(application)(input.registration)

          if (!(new TextEncoder().encode(payload).length <= 1048576)) return yield* invalidState()
          const registration = yield* Schema.decodeEffect(application)(payload)

          const result = yield* mapping.inspect({
            intent: OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationIntent, input.intent),
            registration
          })

          return {
            ...result,
            fingerprint: yield* Schema.decodeEffect(OAuth.OAuthRegistrationFingerprint)(
              result.fingerprint
            )
          }
        })
      ),
    register: (original, prepare) =>
      read(
        Effect.gen(function*() {
          const access = OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationAccess, original.access)
          const expected = OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationIntent, original.intent)
          const found = yield* state.read(access)

          const decide = (decision: OAuth.OAuthRegistrationDecision) =>
            run(prepareOAuthNative(decision, prepare), "statement")

          const rejected = () => prepareOAuthNative({ _tag: "Rejected" } as const, prepare)

          if (
            found === undefined ||
            state.intentStored.encode(found.inspection.intent) !==
              state.intentStored.encode(expected)
          ) {
            return decide({ _tag: "Rejected" })
          }

          const binding = OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationInspection, {
            intent: expected,
            application: {
              _tag: "Registered",
              commandId: original.commandId,
              fingerprint: original.fingerprint,
              payload: original.payload,
              requestId: original.requestId
            }
          }).application

          if (!(binding._tag === "Registered")) return yield* invalidState()
          // Replay comparison precedes application callbacks, allocation and writes.
          const previous = found.inspection.application

          if (previous._tag !== "Unbound") {
            if (
              previous.commandId !== binding.commandId ||
              previous.fingerprint !== binding.fingerprint ||
              previous.payload !== binding.payload ||
              previous.requestId !== binding.requestId
            ) {
              return decide({ _tag: "Conflict" })
            }

            return decide(
              previous._tag === "Registered"
                ? { _tag: "Registered", replayed: true }
                : { _tag: "Rejected" }
            )
          }

          return run(
            Effect.gen(function*() {
              if (!(new TextEncoder().encode(binding.payload).length <= 1048576)) {
                return yield* invalidState()
              }
              const registration = yield* Schema.decodeEffect(application)(binding.payload)

              if (!((yield* Schema.encodeEffect(application)(registration)) === binding.payload)) {
                return yield* invalidState()
              }
              if (
                (yield* Schema.encodeEffect(application)(original.registration)) !== binding.payload
              ) {
                return yield* rejected()
              }
              const inspection = yield* mapping.inspect({ intent: expected, registration })

              if (inspection.fingerprint !== binding.fingerprint) return yield* rejected()
              const policyInput = { intent: expected, registration }

              const eligible = sql.and([
                state.unowned(found.identityKey),
                tables.expression(mapping.eligibility.admission(policyInput)),
                horizon(expected)
              ])

              let admitted = inspection.eligible &&
                (batch === undefined || (yield* sql`select 1 where ${eligible}`).length === 1)

              let final: Fragment = horizon(expected)
              let authentication: OAuth.OAuthRegistrationAuthentication | undefined

              if (admitted) {
                const nativeId = yield* mapping.allocateSubjectId
                const subjectId = yield* mapping.subjectId.toSubject(nativeId)

                if (
                  !mapping.subjectId.equals(nativeId, yield* mapping.subjectId.toNative(subjectId))
                ) {
                  return yield* invalidState()
                }

                const credentialId = yield* Schema.decodeEffect(
                  OAuth.OAuthCredentialSnapshot.fields.credentialId
                )(yield* mapping.allocateCredentialId)

                const revision = yield* Schema.decodeEffect(
                  OAuth.OAuthCredentialSnapshot.fields.credentialRevision
                )(yield* mapping.allocateRevision)

                const subjectValues = {
                  ...mapping.encodeSubjectInsert(
                    { ...policyInput, requestId: binding.requestId },
                    { subjectId: nativeId, securityRevision: revision }
                  ),
                  [s.id]: nativeId,
                  [s.securityRevision]: revision
                }

                if (!s.isActiveStatus(subjectValues[s.status])) return yield* invalidState()
                // A newly inserted subject is the first lock. The exact unbound intent
                // CAS below arbitrates concurrent registration; a loser rolls back all
                // local rows and never repeats provisioning automatically.
                const creation = yield* conditionalInsert(subject, subjectValues, eligible)

                if (batch !== undefined) yield* state.change(creation)
                else admitted = (yield* executeSqlChange(sql, creation)) === 1
                if (admitted) {
                  const policy = { ...policyInput, nativeSubjectId: nativeId }

                  if (!((mapping.eligibility.guards?.length ?? 0) <= 32)) {
                    return yield* invalidState()
                  }
                  for (const guard of mapping.eligibility.guards ?? []) {
                    const table = tables(guard.table)

                    const rows = yield* sql`select ${table.column(guard.orderBy)} from ${table.name} where ${
                      tables.expression(guard.condition(policy))
                    } order by ${table.column(guard.orderBy)} limit 65 ${
                      batch === undefined
                        ? sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })
                        : sql``
                    }`

                    if (!(rows.length > 0 && rows.length <= 64)) return yield* invalidState()
                  }

                  if (
                    !(
                      (yield* mutation.ensureOwnership(expected.identity, nativeId)) ===
                        found.identityKey
                    )
                  ) {
                    return yield* invalidState()
                  }

                  const values = {
                    ...c.encodeInsert({
                      moduleId: expected.context.moduleId,
                      subjectId: nativeId,
                      identityKey: found.identityKey,
                      credentialId,
                      credentialRevision: revision
                    }),
                    [c.moduleId]: expected.context.moduleId,
                    [c.subjectId]: nativeId,
                    [c.identityKey]: found.identityKey,
                    [c.credentialId]: credentialId,
                    [c.credentialRevision]: revision
                  }

                  if (!c.isActiveStatus(values[c.status])) return yield* invalidState()
                  yield* state.change(
                    yield* conditionalInsert(
                      credential,
                      values,
                      sql.and([
                        tables.expression(mapping.eligibility.admission(policy)),
                        horizon(expected),
                        sql`exists(select 1 from ${mutation.ownership.name} where ${
                          mutation.ownerCondition(found.identityKey, nativeId)
                        })`
                      ])
                    )
                  )

                  const factor = {
                    ...a.encodeInsert({ subjectId: nativeId, credentialId, revision }),
                    [a.subjectId]: nativeId,
                    [a.credentialId]: credentialId,
                    [a.revision]: revision
                  }

                  if (!a.isActiveStatus(factor[a.status])) return yield* invalidState()
                  yield* state.change(authority.insert(factor))
                  authentication = OAuth.snapshotOAuthSync(OAuth.OAuthRegistrationAuthentication, {
                    intent: expected,
                    credentialId,
                    credentialRevision: revision,
                    revision: {
                      subjectId,
                      securityRevision: revision,
                      credentials: [{ credentialId, revision }]
                    }
                  })
                  final = sql.and([
                    horizon(expected),
                    tables.expression(mapping.eligibility.postcondition(policy)),
                    mutation.authorityCondition(nativeId, authentication.revision),
                    sql`exists(select 1 from ${credential.name} where ${credential.column(c.subjectId)} = ${
                      credential.value(c.subjectId, nativeId)
                    } and ${
                      exactSqlText(
                        sql,
                        credential.column(c.credentialId),
                        credential.value(c.credentialId, credentialId)
                      )
                    } and ${
                      exactSqlText(
                        sql,
                        credential.column(c.credentialRevision),
                        credential.value(c.credentialRevision, revision)
                      )
                    } and ${
                      exactSqlText(
                        sql,
                        credential.column(c.identityKey),
                        credential.value(c.identityKey, found.identityKey)
                      )
                    } and ${tables.expression(c.activeCondition)})`,
                    sql`exists(select 1 from ${mutation.ownership.name} where ${
                      mutation.ownerCondition(found.identityKey, nativeId)
                    })`
                  ])
                }
              }

              const snapshot = stored.encode({
                intent: expected,
                application: { ...binding, _tag: admitted ? "Registered" : "Rejected" }
              })

              yield* state.change(
                sql`${intent.update({ [i.snapshot]: snapshot })} where ${
                  state.key(access.moduleId, access.reference)
                } and ${state.exact(i.snapshot, found.encoded)} and ${final}`
              )
              if (Option.isSome(external)) {
                yield* state.finish(
                  "oauth-registration-outcome",
                  sql.and([
                    final,
                    sql`exists(select 1 from ${intent.name} where ${state.key(access.moduleId, access.reference)} and ${
                      state.exact(i.snapshot, snapshot)
                    })`,
                    sql`${now} < ${expected.expiresAtMillis}`
                  ])
                )
              }

              if (!admitted) return yield* rejected()
              if (!(authentication !== undefined)) return yield* invalidState()

              return yield* prepareOAuthNative(
                { _tag: "Registered", replayed: false, authentication },
                prepare
              )
            })
          )
        })
      ).pipe(Effect.flatten),
    cleanup: (input, prepare) =>
      run(
        Effect.gen(function*() {
          const parsed = OAuth.snapshotOAuthSync(OAuth.OAuthCleanupInput, input)

          return yield* prepareOAuthNative(
            yield* state.cleanup(parsed.moduleId, parsed.limit),
            prepare
          )
        })
      )
  }

  return { registrationAuthority: service }
})

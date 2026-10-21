import type {
  EmailCommandId,
  EmailRegistrationDecision,
  EmailUnavailable,
  PrepareEmailCommit
} from "@effect/auth/Email"
import { CurrentCommitJournal, type LifecycleHooks, type PreparedCommit } from "@effect/auth/Hooks"
import type { LoginIdentifier } from "@effect/auth/Identity"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { ProofRedemptionInput, type ProofRedemptionPlan } from "@effect/auth/Proofs"
import type { TokenDigest } from "@effect/auth/Schema"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { emailUnavailable as unavailable, invalidEmailState as invalidState } from "./emailNativeState.ts"
import { allocateEmailValue } from "./emailPolicy.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyEmailRegistrationMapping } from "./models/emailModel.ts"
import type { AnyProofPersistenceMapping } from "./models/proofModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { makeNativeProofStore } from "./proofNative.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"

export interface EmailRegistrationAuthority<Registration> {
  readonly inspect: (input: {
    readonly identifier: LoginIdentifier
    readonly registration: Registration
  }) => Effect.Effect<
    { readonly fingerprint: TokenDigest; readonly eligible: boolean },
    EmailUnavailable
  >
  readonly registerWithProof: <A>(
    input: {
      readonly moduleId: string
      readonly commandId: EmailCommandId
      readonly requestId: string
      readonly identifier: LoginIdentifier
      readonly registration: Registration
      readonly fingerprint: TokenDigest
      readonly redemption: ProofRedemptionPlan
    },
    prepare: PrepareEmailCommit<EmailRegistrationDecision, A>
  ) => Effect.Effect<PreparedCommit<A>, EmailUnavailable>
}

/** Proof redemption, SQL provisioning, and verified ownership commit together. No registration receipt survives the proof. */
export const makeNativeEmailRegistrationServices = Effect.fnUntraced(function*<Registration>(
  tables: NativeSqlTables,
  mapping: AnyEmailRegistrationMapping<Registration>,
  proofs: AnyProofPersistenceMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly registrationAuthority: EmailRegistrationAuthority<Registration> },
  never,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const sql = (yield* SqlClient).withoutTransforms(),
    executor = yield* makeSqlCommitExecutor(unavailable),
    cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
      Context.add(Digest.Digest, yield* Digest.Digest)
    )

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential,
    a = mapping.authorityCredential

  const subject = tables(s.table),
    identifier = tables(i.table),
    credential = tables(c.table),
    authority = tables(a.table)

  const exact = (t: SqlTable, key: string, value: unknown) => exactSqlText(sql, t.column(key), t.value(key, value))

  const id = (t: SqlTable, key: string, value: unknown) => sql`${t.column(key)} = ${t.value(key, value)}`

  const identifierKey = (value: LoginIdentifier) =>
    sql.and([
      exact(identifier, i.namespace, value.namespace),
      exact(identifier, i.value, value.value)
    ])

  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` }),
    now = tables.expression(mapping.clock.engineNowMillis),
    mode = "interactive"

  const run = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    batch === undefined
      ? executor.run(work.pipe(Effect.provideContext(cryptoServices)))
      : executor
        .batch(work.pipe(Effect.provideContext(cryptoServices)))
        .pipe(Effect.provideService(SqlBatchCommit, batch))

  const stage = Effect.fnUntraced(function*(statement: Fragment) {
    if (batch === undefined) {
      if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
    } else {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    }
  })

  const prepare = Effect.fnUntraced(
    function*<A>(decision: EmailRegistrationDecision, project: PrepareEmailCommit<EmailRegistrationDecision, A>) {
      const receipt = project(decision, yield* CurrentCommitJournal)

      yield* registerSqlCommitReceipt(receipt)

      return receipt
    }
  )

  const registrationAuthority: EmailRegistrationAuthority<Registration> = {
    inspect: (input) => executor.read(mapping.inspect(input)),
    registerWithProof: Effect.fnUntraced(function*(original, project) {
      const registration = yield* mapping.snapshotRegistration(original.registration)

      const inspection = yield* mapping.inspect({
        identifier: original.identifier,
        registration: yield* mapping.snapshotRegistration(registration)
      })

      const redemption = yield* Schema.decodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
        yield* Schema.encodeEffect(Schema.toCodecIso(ProofRedemptionInput))(
          original.redemption.input
        )
      )

      const input = {
        ...original,
        identifier: { ...original.identifier },
        registration,
        redemption
      }

      return yield* run(
        Effect.gen(function*() {
          const binding = redemption.binding

          if (
            !inspection.eligible ||
            inspection.fingerprint !== input.fingerprint ||
            redemption.moduleId !== `${input.moduleId}/registration` ||
            redemption.purpose !== "email-code-registration" ||
            binding._tag !== "Identifier" ||
            binding.identifier.namespace !== input.identifier.namespace ||
            binding.identifier.value !== input.identifier.value ||
            input.requestId !== `email-registration:${input.moduleId}:${redemption.proofId}`
          ) {
            return yield* prepare({ _tag: "Rejected" }, project)
          }

          const priorRows = yield* sql`select ${
            identifier.fields("email_registration_identifier_")
          } from ${identifier.name} where ${identifierKey(input.identifier)} limit 2`

          if (!(priorRows.length <= 1)) return yield* invalidState()

          const prior = priorRows[0] === undefined
            ? undefined
            : identifier.decode(priorRows[0], "email_registration_identifier_")

          let previous:
            | {
              readonly native: unknown
              readonly securityRevision: SecurityRevision
              readonly bindingRevision: SecurityRevision
            }
            | undefined

          if (prior !== undefined) {
            if (
              !(
                prior[i.namespace] === input.identifier.namespace &&
                prior[i.value] === input.identifier.value
              )
            ) {
              return yield* invalidState()
            }
            if (prior[i.verifiedAt] !== null || !i.isMutableTarget(prior)) {
              return yield* prepare({ _tag: "Rejected" }, project)
            }

            const previousSubject = yield* mapping.subjectId.toSubject(prior[i.subjectId]),
              native = yield* mapping.subjectId.toNative(previousSubject)

            const rows = yield* sql`select ${
              subject.fields("email_registration_old_subject_")
            } from ${subject.name} where ${id(subject, s.id, native)} limit 2 ${batch === undefined ? lock : sql``}`

            if (rows.length !== 1) return yield* prepare({ _tag: "Rejected" }, project)
            const row = subject.decode(rows[0]!, "email_registration_old_subject_")

            if (!((yield* mapping.subjectId.toSubject(row[s.id])) === previousSubject)) {
              return yield* invalidState()
            }

            const currentRows = yield* sql`select ${
              identifier.fields("email_registration_current_identifier_")
            } from ${identifier.name} where ${identifierKey(input.identifier)} and ${
              id(identifier, i.subjectId, native)
            } and ${exact(identifier, i.bindingRevision, prior[i.bindingRevision])} and ${
              identifier.column(i.verifiedAt)
            } is null limit 2`

            if (
              currentRows.length !== 1 ||
              !i.isMutableTarget(
                identifier.decode(currentRows[0]!, "email_registration_current_identifier_")
              )
            ) {
              return yield* prepare({ _tag: "Rejected" }, project)
            }
            if (batch !== undefined) {
              if (!(i.d1MutableTargetCondition !== undefined)) return yield* invalidState()
              yield* appendSqlBatchStatement(
                sqlBatchAssertion(
                  sql,
                  sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.identifier)} and ${
                    id(identifier, i.subjectId, native)
                  } and ${exact(identifier, i.bindingRevision, prior[i.bindingRevision])} and ${
                    identifier.column(i.verifiedAt)
                  } is null and ${
                    tables.expression(
                      i.d1MutableTargetCondition({ identifier: input.identifier, nativeSubjectId: native })
                    )
                  })`
                )
              )
            }
            previous = {
              native,
              securityRevision: yield* Schema.decodeUnknownEffect(SecurityRevision)(
                row[s.securityRevision]
              ),
              bindingRevision: yield* Schema.decodeUnknownEffect(SecurityRevision)(
                prior[i.bindingRevision]
              )
            }
          }

          const proof = yield* makeNativeProofStore(tables, proofs, batch !== undefined),
            redeemed = yield* proof.redeemLocked(redemption)

          yield* registerSqlCommitReceipt(
            original.redemption.prepare(
              redeemed.decision,
              yield* CurrentCommitJournal,
              (value) => value
            )
          )
          if (redeemed.decision !== "redeemed") {
            return yield* prepare({ _tag: "Rejected" }, project)
          }

          const allocate = () => allocateEmailValue(mode, mapping.allocateRevision, mapping.allocateRevisionSync)

          const securityRevision = yield* allocate(),
            identifierRevision = yield* allocate(),
            credentialRevision = yield* allocate(),
            displacedRevision = previous === undefined ? undefined : yield* allocate(),
            credentialId = yield* allocateEmailValue(
              mode,
              mapping.allocateCredentialId,
              mapping.allocateCredentialIdSync
            )

          const provisioning = mapping.provisioning

          if (batch !== undefined && provisioning.idMode === "generated") {
            return yield* unavailable()
          }

          let native = provisioning.idMode === "generated"
            ? undefined
            : yield* allocateEmailValue(
              mode,
              provisioning.allocateSubjectId,
              provisioning.allocateSubjectIdSync
            )

          const insertion = sql`${
            subject.insert(provisioning.encodeSubjectInsert(input, { nativeSubjectId: native, securityRevision }))
          }`

          if (provisioning.idMode === "generated") {
            const rows = yield* sql.onDialectOrElse({
              mysql: () =>
                insertion.raw.pipe(
                  Effect.flatMap(
                    Schema.decodeUnknownEffect(
                      Schema.Struct({ insertId: Schema.Union([Schema.Int, Schema.String]) })
                    )
                  ),
                  Effect.map((header) => [{ [s.id]: header.insertId }])
                ),
              orElse: () =>
                sql`${insertion} returning ${subject.fields("email_registration_generated_")}`.pipe(
                  Effect.map((rows) => rows.map((row) => subject.decode(row, "email_registration_generated_")))
                )
            })

            native = yield* provisioning.decodeGeneratedId(rows)
          } else yield* stage(insertion)
          if (!(native !== undefined)) return yield* invalidState()
          const subjectId = yield* mapping.subjectId.toSubject(native)
          const clock = yield* sql`select ${now} as engine_now`
          const verifiedAt = Number(clock[0]?.engine_now)

          if (!Number.isSafeInteger(verifiedAt)) return yield* invalidState()

          const values = i.encodeVerifiedInsert({
            identifier: input.identifier,
            subjectId: native,
            verifiedAtMillis: verifiedAt,
            bindingRevision: identifierRevision
          })

          if (previous === undefined) yield* stage(identifier.insert(values))
          else {
            if (!(displacedRevision !== previous.securityRevision)) return yield* invalidState()
            yield* stage(
              sql`${identifier.update(values)} where ${identifierKey(input.identifier)} and ${
                id(identifier, i.subjectId, previous.native)
              } and ${exact(identifier, i.bindingRevision, previous.bindingRevision)} and ${
                identifier.column(i.verifiedAt)
              } is null`
            )
            yield* stage(
              sql`${subject.update({ [s.securityRevision]: displacedRevision })} where ${
                id(subject, s.id, previous.native)
              } and ${exact(subject, s.securityRevision, previous.securityRevision)}`
            )
          }
          yield* stage(
            credential.insert(
              c.encodeVerifiedInsert({
                moduleId: input.moduleId,
                subjectId: native,
                credentialId,
                identifier: input.identifier,
                credentialRevision
              })
            )
          )
          yield* stage(
            authority.insert(
              a.encodeInsert({ subjectId: native, credentialId, revision: credentialRevision })
            )
          )

          const conditions: Array<Fragment> = [
            redeemed.validUntil,
            sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
              exact(subject, s.securityRevision, securityRevision)
            } and ${id(subject, s.status, s.activeStatusValue)})`,
            sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.identifier)} and ${
              id(identifier, i.subjectId, native)
            } and ${exact(identifier, i.bindingRevision, identifierRevision)} and ${
              id(identifier, i.verifiedAt, mapping.clock.encodeInstant(verifiedAt))
            })`,
            sql`exists(select 1 from ${credential.name} where ${exact(credential, c.moduleId, input.moduleId)} and ${
              exact(credential, c.credentialId, credentialId)
            } and ${id(credential, c.subjectId, native)} and ${
              exact(credential, c.credentialRevision, credentialRevision)
            } and ${exact(credential, c.identifierNamespace, input.identifier.namespace)} and ${
              exact(credential, c.identifierValue, input.identifier.value)
            } and ${id(credential, c.status, c.activeStatusValue)})`,
            sql`exists(select 1 from ${authority.name} where ${id(authority, a.subjectId, native)} and ${
              exact(authority, a.credentialId, credentialId)
            } and ${exact(authority, a.revision, credentialRevision)} and ${
              id(authority, a.status, a.activeStatusValue)
            })`
          ]

          if (previous !== undefined) {
            conditions.push(
              sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, previous.native)} and ${
                exact(subject, s.securityRevision, displacedRevision)
              })`
            )
          }
          if (batch !== undefined) {
            if (!(i.d1CurrentCondition !== undefined)) return yield* invalidState()
            conditions.push(
              sql`exists(select 1 from ${identifier.name} where ${identifierKey(input.identifier)} and ${
                id(identifier, i.subjectId, native)
              } and ${
                tables.expression(
                  i.d1CurrentCondition({
                    identifier: input.identifier,
                    nativeSubjectId: native,
                    bindingRevision: identifierRevision
                  })
                )
              })`
            )
            yield* registerSqlBatchPostcondition({
              name: "email-registration-authority",
              statement: sqlBatchAssertion(sql, sql.and(conditions))
            })
          } else {
            yield* registerSqlPostcondition({
              name: "email-registration-authority",
              check: Effect.gen(function*() {
                const rows = yield* sql`select ${
                  identifier.fields("email_registration_final_")
                } from ${identifier.name} where ${identifierKey(input.identifier)} and ${sql.and(conditions)} limit 2`

                if (
                  !(
                    rows.length === 1 &&
                    i.isCurrent(identifier.decode(rows[0]!, "email_registration_final_"))
                  )
                ) {
                  return yield* invalidState()
                }
              }).pipe(
                Effect.catchCause((cause) =>
                  Effect.failCause(
                    Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "decode", cause: error }))
                  )
                )
              )
            })
          }
          if (!((yield* mapping.subjectId.toSubject(native)) === subjectId)) {
            return yield* invalidState()
          }

          return yield* prepare({ _tag: "Registered" }, project)
        })
      )
    }, (effect) =>
      reportPersistenceFailure(effect, (error) => error._tag === "EmailUnavailable", {
        markReported: true
      }), Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))))
  }

  return { registrationAuthority }
})

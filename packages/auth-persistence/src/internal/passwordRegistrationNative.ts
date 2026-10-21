import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import type { LoginIdentifier } from "@effect/auth/Identity"
import {
  type PasswordRegistrationDecision,
  type PasswordReplacement,
  PasswordUnavailable,
  type PreparePasswordCommit
} from "@effect/auth/Password"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import type { SubjectId } from "@effect/auth/Schema"
import type { SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { isMappedConstraintConflict, PersistenceMappingError } from "./mappingError.ts"
import type { AnyPasswordRegistrationMapping } from "./models/passwordModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { allocatePasswordValue } from "./passwordPolicy.ts"
import type { PasswordRegistrationAuthority } from "./registrationContract.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"

const unavailable = () => PasswordUnavailable.make({})

const invalidState = () => unavailable()

/** @internal */
export class PasswordIdentifierTaken extends Schema.TaggedError<PasswordIdentifierTaken>()(
  "PasswordIdentifierTaken",
  {}
) {}

type BindingMapping =
  & Pick<
    AnyPasswordRegistrationMapping,
    "subject" | "identifier" | "credential" | "authorityCredential" | "subjectId"
  >
  & { readonly isIdentifierConflict?: (cause: unknown) => boolean }

/**
 * Shared binding writes for mapped SQL provisioning and application provisioning.
 *
 * @internal
 */
export const makeNativePasswordRegistrationStore = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: BindingMapping,
  batch = false
) {
  const sql = (yield* SqlClient).withoutTransforms()

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential,
    a = mapping.authorityCredential

  const subject = tables(s.table),
    identifier = tables(i.table),
    password = tables(c.table),
    authority = tables(a.table)

  const exact = (table: SqlTable, key: string, value: unknown) =>
    exactSqlText(sql, table.column(key), table.value(key, value))

  const owner = (table: SqlTable, key: string, value: unknown) => sql`${table.column(key)} = ${table.value(key, value)}`

  const stage = Effect.fnUntraced(function*(statement: Fragment) {
    if (batch) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    } else {
      if (!((yield* executeSqlChange(sql, statement)) === 1)) return yield* invalidState()
    }
  })

  const available = (value: LoginIdentifier) =>
    sql`select 1 from ${identifier.name} where ${exact(identifier, i.namespace, value.namespace)} and ${
      exact(identifier, i.value, value.value)
    } limit 1`

  const bind = Effect.fnUntraced(function*(input: {
    readonly moduleId: string
    readonly identifier: LoginIdentifier
    readonly subjectId: SubjectId
    readonly securityRevision: SecurityRevision
    readonly identifierRevision: SecurityRevision
    readonly credentialId: string
    readonly credentialRevision: SecurityRevision
    readonly verifierVersion: SecurityRevision
    readonly replacement: PasswordReplacement
  }) {
    const nativeId = yield* mapping.subjectId.toNative(input.subjectId)

    const initial = sql`${
      identifier.insert(i.encodeInitialInsert(input.identifier, nativeId, input.identifierRevision))
    }`

    if (batch) yield* stage(initial)
    else {
      yield* sql.onDialectOrElse({
        mysql: () =>
          stage(initial).pipe(
            Effect.catchCauseIf(
              (cause) =>
                mapping.isIdentifierConflict !== undefined &&
                isMappedConstraintConflict(mapping.isIdentifierConflict, cause),
              () => Effect.fail(PasswordIdentifierTaken.make({}))
            )
          ),
        orElse: () =>
          sql`${initial} on conflict (${identifier.columnName(i.namespace)}, ${
            identifier.columnName(i.value)
          }) do nothing returning 1 as bound`.pipe(
            Effect.flatMap((rows) => rows.length === 1 ? Effect.void : Effect.fail(PasswordIdentifierTaken.make({})))
          )
      })
    }
    yield* stage(sql`${password.insert(c.encodeInsert({ ...input, subjectId: nativeId }))}`)
    yield* stage(
      sql`${
        authority.insert(
          a.encodeInsert({ subjectId: nativeId, credentialId: input.credentialId, revision: input.credentialRevision })
        )
      }`
    )
    const passwordCondition = sql`exists(select 1 from ${password.name} where ${
      owner(password, c.subjectId, nativeId)
    } and ${exact(password, c.moduleId, input.moduleId)} and ${
      exact(password, c.credentialId, input.credentialId)
    } and ${exact(password, c.credentialRevision, input.credentialRevision)} and ${
      exact(password, c.verifierVersion, input.verifierVersion)
    } and ${exact(password, c.verifier, Redacted.value(input.replacement.verifier))} and ${
      exact(password, c.normalization, input.replacement.normalization)
    })`
    const identifierCondition = sql`exists(select 1 from ${identifier.name} where ${
      exact(identifier, i.namespace, input.identifier.namespace)
    } and ${exact(identifier, i.value, input.identifier.value)} and ${owner(identifier, i.subjectId, nativeId)} and ${
      exact(identifier, i.bindingRevision, input.identifierRevision)
    } and ${identifier.column(i.verifiedAt)} is null)`
    const authorityCondition = sql`exists(select 1 from ${authority.name} where ${
      owner(authority, a.subjectId, nativeId)
    } and ${exact(authority, a.credentialId, input.credentialId)} and ${
      exact(authority, a.revision, input.credentialRevision)
    } ${
      a.status === undefined
        ? sql``
        : sql`and ${authority.column(a.status)} = ${authority.value(a.status, a.d1ActiveStatusValue)}`
    })`

    if (batch) {
      if (
        !(
          i.d1CurrentCondition !== undefined &&
          s.d1ActiveStatusValue !== undefined &&
          (a.status === undefined || a.d1ActiveStatusValue !== undefined)
        )
      ) {
        return yield* invalidState()
      }
      yield* registerSqlBatchPostcondition({
        name: "password-registration-authority",
        statement: sqlBatchAssertion(
          sql,
          sql.and([
            passwordCondition,
            identifierCondition,
            sql`exists(select 1 from ${identifier.name} where ${
              exact(identifier, i.namespace, input.identifier.namespace)
            } and ${exact(identifier, i.value, input.identifier.value)} and ${
              owner(identifier, i.subjectId, nativeId)
            } and ${
              tables.expression(i.d1CurrentCondition!({ identifier: input.identifier, nativeSubjectId: nativeId }))
            })`,
            authorityCondition,
            sql`exists(select 1 from ${subject.name} where ${owner(subject, s.id, nativeId)} and ${
              exact(subject, s.securityRevision, input.securityRevision)
            } and ${subject.column(s.status)} = ${subject.value(s.status, s.d1ActiveStatusValue)})`
          ])
        )
      })
    } else {
      yield* registerSqlPostcondition({
        name: "password-registration-authority",
        check: Effect.gen(function*() {
          const rows = yield* sql`select ${subject.fields("registration_subject_")}, ${
            authority.fields("registration_factor_")
          }, ${identifier.fields("registration_identifier_")} from ${subject.name} inner join ${identifier.name} on ${
            exact(identifier, i.namespace, input.identifier.namespace)
          } and ${exact(identifier, i.value, input.identifier.value)} and ${
            owner(identifier, i.subjectId, nativeId)
          } inner join ${authority.name} on ${owner(authority, a.subjectId, nativeId)} and ${
            exact(authority, a.credentialId, input.credentialId)
          } and ${exact(authority, a.revision, input.credentialRevision)} where ${owner(subject, s.id, nativeId)} and ${
            exact(subject, s.securityRevision, input.securityRevision)
          } and ${passwordCondition} and ${identifierCondition} limit 2`

          if (!(rows.length === 1)) return yield* invalidState()
          const subjectRow = subject.decode(rows[0]!, "registration_subject_")
          const factorRow = authority.decode(rows[0]!, "registration_factor_")

          if (
            !(
              i.isCurrent(identifier.decode(rows[0]!, "registration_identifier_")) &&
              s.isActiveStatus(subjectRow[s.status]) &&
              (a.status === undefined || a.isActiveStatus?.(factorRow[a.status]) === true)
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
  })

  const prepare = Effect.fnUntraced(
    function*<A>(value: PasswordRegistrationDecision, project: PreparePasswordCommit<PasswordRegistrationDecision, A>) {
      const receipt = project(value, yield* CurrentCommitJournal)
      const current = yield* CurrentSqlCommit

      if (current.mode === "batch" && current.statements.length === 0) {
        yield* appendSqlBatchStatement(sql`select 1`)
      }
      if (!(receipt?._tag === "PreparedCommit" && Effect.isEffect(receipt.read))) {
        return yield* invalidState()
      }
      yield* registerSqlCommitReceipt(receipt)

      return receipt
    }
  )

  return { available, bind, prepare, stage }
})

export const makeNativePasswordRegistrationServices = Effect.fnUntraced(function*<Registration>(
  tables: NativeSqlTables,
  mapping: AnyPasswordRegistrationMapping<Registration>,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly registrationAuthority: PasswordRegistrationAuthority<Registration> },
  PasswordUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const sql = (yield* SqlClient).withoutTransforms()
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const store = yield* makeNativePasswordRegistrationStore(tables, mapping, batch !== undefined)
  const mode = "interactive"
  const parent = yield* Effect.serviceOption(CurrentSqlCommit)

  const run = <A, E, R>(work: Effect.Effect<A, E, R>, suppressed: Effect.Effect<A, E, R>) =>
    batch !== undefined
      ? executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
      : Option.isSome(parent)
      ? executor.run(work)
      : executor
        .operation(
          reportPersistenceFailure(
            work,
            (error) => error instanceof PasswordIdentifierTaken || Schema.is(PasswordUnavailable)(error),
            { markReported: true }
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) => error instanceof PasswordIdentifierTaken ? error : unavailable())
              )
            )
          )
        )
        .pipe(
          Effect.catchCause((cause) =>
            cause.reasons.length > 0 &&
              cause.reasons.every(
                (reason) => Cause.isFailReason(reason) && reason.error instanceof PasswordIdentifierTaken
              )
              ? executor.run(suppressed, "statement")
              : Effect.failCause(cause)
          ),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
        )

  const registrationAuthority: PasswordRegistrationAuthority<Registration> = {
    register: (input, project) =>
      executor.read(store.available(input.identifier)).pipe(
        Effect.flatMap((existing) =>
          existing.length !== 0
            ? executor.run(store.prepare({ _tag: "Suppressed" }, project), "statement")
            : run(
              Effect.gen(function*() {
                const provisioning = mapping.provisioning

                if (batch !== undefined && provisioning.idMode === "generated") {
                  return yield* unavailable()
                }

                let nativeId = provisioning.idMode === "generated"
                  ? undefined
                  : yield* allocatePasswordValue(
                    mode,
                    provisioning.allocateSubjectId,
                    provisioning.allocateSubjectIdSync
                  )

                const securityRevision = yield* allocatePasswordValue(
                  mode,
                  mapping.allocateRevision,
                  mapping.allocateRevisionSync
                )

                const identifierRevision = yield* allocatePasswordValue(
                  mode,
                  mapping.allocateRevision,
                  mapping.allocateRevisionSync
                )

                const credentialRevision = yield* allocatePasswordValue(
                  mode,
                  mapping.allocateRevision,
                  mapping.allocateRevisionSync
                )

                const verifierVersion = yield* allocatePasswordValue(
                  mode,
                  mapping.allocateRevision,
                  mapping.allocateRevisionSync
                )

                const credentialId = yield* allocatePasswordValue(
                  mode,
                  mapping.allocateCredentialId,
                  mapping.allocateCredentialIdSync
                )

                const subject = tables(mapping.subject.table)
                const insertion = sql`${
                  subject.insert(
                    provisioning.encodeSubjectInsert(input, { nativeSubjectId: nativeId, securityRevision })
                  )
                }`

                if (provisioning.idMode === "generated") {
                  const generated = yield* sql.onDialectOrElse({
                    mysql: () =>
                      insertion.raw.pipe(
                        Effect.flatMap(
                          Schema.decodeUnknownEffect(
                            Schema.Struct({
                              insertId: Schema.Union([Schema.Int, Schema.String])
                            })
                          )
                        ),
                        Effect.map((header) => [{ [mapping.subject.id]: header.insertId }])
                      ),
                    orElse: () =>
                      sql`${insertion} returning ${subject.fields("registration_generated_")}`.pipe(
                        Effect.map((rows) => rows.map((row) => subject.decode(row, "registration_generated_")))
                      )
                  })

                  nativeId = yield* provisioning.decodeGeneratedId(generated)
                } else yield* store.stage(insertion)
                if (!(nativeId !== undefined)) return yield* invalidState()
                const subjectId = yield* mapping.subjectId.toSubject(nativeId)

                yield* store.bind({
                  ...input,
                  subjectId,
                  securityRevision,
                  identifierRevision,
                  credentialId,
                  credentialRevision,
                  verifierVersion
                })

                return yield* store.prepare({ _tag: "Created", subjectId }, project)
              }),
              store.prepare({ _tag: "Suppressed" }, project)
            )
        )
      )
  }

  return { registrationAuthority }
})

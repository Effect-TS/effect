import type { LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationClock } from "@effect/auth/Operations"
import { SessionInvalid, type SignedSessionValidity, StaleAuthentication } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { SignedSessionValidityMapping } from "./models/sessionModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { prepareNativeSession } from "./sessionNativePending.ts"
import { invalidSessionState, normalizeSessionOperation, sessionUnavailable } from "./sessionNativeState.ts"
import { allocateSessionValue } from "./sessionPolicy.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import type { AnyTableModel } from "./tableModel.ts"

export type NativeSignedSessionValidityMapping = SignedSessionValidityMapping<
  AnyTableModel,
  AnyTableModel,
  unknown,
  unknown
>

export const makeNativeSignedSessionValidityServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: NativeSignedSessionValidityMapping
): Effect.fn.Return<
  { readonly signedSessionValidity: SignedSessionValidity },
  never,
  SqlClient | LifecycleHooks | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const { futureToleranceMillis } = yield* AuthenticationClock

  const sql = (yield* SqlClient).withoutTransforms(),
    executor = yield* makeSqlCommitExecutor(sessionUnavailable)

  const external = yield* Effect.serviceOption(CurrentSqlCommit)

  const s = mapping.subject,
    t = mapping.tombstone,
    subject = tables(s.table),
    tombstone = tables(t.table),
    now = tables.expression(mapping.clock.engineNowMillis)

  const id = (table: SqlTable, key: string, value: unknown) => sql`${table.column(key)} = ${table.value(key, value)}`

  const exact = (table: SqlTable, key: string, value: unknown) =>
    exactSqlText(sql, table.column(key), table.value(key, value))

  const key = (nativeSubject: unknown, nativeSession: unknown) =>
    sql.and([
      exact(tombstone, t.moduleId, mapping.moduleId),
      id(tombstone, t.subjectId, nativeSubject),
      id(tombstone, t.sessionId, nativeSession)
    ])

  const native = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    batch === undefined
      ? executor.operation(normalizeSessionOperation(work), "statement")
      : executor
        .operationBatch(normalizeSessionOperation(work))
        .pipe(Effect.provideService(SqlBatchCommit, batch))

  const stage = Effect.fnUntraced(function*(statement: Fragment, expected?: number) {
    if (batch !== undefined) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      if (expected !== undefined) {
        yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${expected}`))
      }

      return expected
    }

    return yield* executeSqlChange(sql, statement)
  })

  const final = Effect.fnUntraced(function*(name: string, condition: Fragment) {
    if (batch !== undefined) {
      yield* registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
    } else if (Option.isSome(external)) {
      yield* registerSqlPostcondition({
        name,
        check: Effect.gen(function*() {
          if (!((yield* sql`select 1 where ${condition}`).length === 1)) {
            return yield* invalidSessionState()
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

  const signedSessionValidity: SignedSessionValidity = {
    verify: (record) =>
      executor
        .verify(
          Effect.gen(function*() {
            const nativeSubject = yield* mapping.subjectId.toNative(record.subjectId),
              nativeSession = yield* mapping.sessionId.toNative(record.sessionId)

            const rows = yield* sql`select ${subject.fields("subject_")} from ${subject.name} where ${
              id(subject, s.id, nativeSubject)
            } and ${id(subject, s.status, s.activeStatusValue)} and ${
              exact(subject, s.securityRevision, record.securityRevision)
            } and ${DateTime.toEpochMillis(record.issuedAt)} <= ${now} + ${futureToleranceMillis} and ${
              DateTime.toEpochMillis(record.issuedAt)
            } < ${DateTime.toEpochMillis(record.expiresAt)} and ${now} < ${
              DateTime.toEpochMillis(record.expiresAt)
            } and ${DateTime.toEpochMillis(record.expiresAt)} <= ${
              DateTime.toEpochMillis(record.absoluteExpiresAt)
            } and not exists(select 1 from ${tombstone.name} where ${key(nativeSubject, nativeSession)}) limit 2`

            if (!(rows.length <= 1)) return yield* invalidSessionState()
            if (rows[0] === undefined) return false
            const decoded = subject.decode(rows[0], "subject_")

            if (
              !(
                (yield* mapping.subjectId.toSubject(decoded[s.id])) === record.subjectId &&
                s.isActiveStatus(decoded[s.status])
              )
            ) {
              return yield* invalidSessionState()
            }

            return true
          })
        )
        .pipe(
          Effect.flatMap((valid) => (valid ? Effect.void : Effect.fail(SessionInvalid.make({}))))
        ),
    revoke: (input, project) =>
      native(
        Effect.gen(function*() {
          const nativeSubject = yield* mapping.subjectId.toNative(input.subjectId),
            nativeSession = yield* mapping.sessionId.toNative(input.sessionId)

          const row = {
            ...t.encodeInsert({
              moduleId: mapping.moduleId,
              subjectId: nativeSubject,
              sessionId: nativeSession,
              absoluteExpiresAt: input.absoluteExpiresAt
            }),
            [t.moduleId]: mapping.moduleId,
            [t.subjectId]: nativeSubject,
            [t.sessionId]: nativeSession,
            [t.absoluteExpiresAt]: t.encodeInstant(input.absoluteExpiresAt)
          }

          const expiry = tables.expression(
            mapping.clock.toMillis(tombstone.column(t.absoluteExpiresAt))
          )

          const next = DateTime.toEpochMillis(input.absoluteExpiresAt)
          const longest = sql`case when ${expiry} >= ${next} then ${tombstone.column(t.absoluteExpiresAt)} else ${
            tombstone.value(t.absoluteExpiresAt, row[t.absoluteExpiresAt])
          } end`
          const insert = tombstone.insert(row)

          const statement = sql.onDialectOrElse({
            mysql: () =>
              sql`${insert} on duplicate key update ${tombstone.columnName(t.absoluteExpiresAt)} = ${longest}`,
            orElse: () =>
              sql`${insert} on conflict (${tombstone.columnName(t.moduleId)}, ${tombstone.columnName(t.subjectId)}, ${
                tombstone.columnName(t.sessionId)
              }) do update set ${tombstone.columnName(t.absoluteExpiresAt)} = ${longest}`
          })

          yield* stage(statement)
          yield* final(
            "assisted-session-revocation",
            sql`exists(select 1 from ${tombstone.name} where ${
              key(nativeSubject, nativeSession)
            } and ${expiry} >= ${next})`
          )

          return yield* prepareNativeSession(undefined, project)
        })
      ),
    revokeAll: (input, project) =>
      native(
        Effect.gen(function*() {
          const nativeSubject = yield* mapping.subjectId.toNative(input.subjectId)

          const next = yield* allocateSessionValue(
            "interactive",
            s.nextSecurityRevision?.(input.expectedSecurityRevision),
            s.nextSecurityRevisionSync === undefined
              ? undefined
              : () => s.nextSecurityRevisionSync!(input.expectedSecurityRevision)
          )

          if (!(next !== input.expectedSecurityRevision)) return yield* invalidSessionState()

          const changed = yield* stage(
            sql`${subject.update({ [s.securityRevision]: next })} where ${id(subject, s.id, nativeSubject)} and ${
              id(subject, s.status, s.activeStatusValue)
            } and ${exact(subject, s.securityRevision, input.expectedSecurityRevision)}`,
            1
          )

          if (changed !== 1) return yield* StaleAuthentication.make({})
          yield* final(
            "all-assisted-session-revocation",
            sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, nativeSubject)} and ${
              exact(subject, s.securityRevision, next)
            })`
          )

          return yield* prepareNativeSession(undefined, project)
        })
      )
  }

  return { signedSessionValidity }
})

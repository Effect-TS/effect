import { AuthenticationClock } from "@effect/auth/Operations"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import type { SubjectId } from "@effect/auth/Schema"
import {
  assessAuthentication,
  type AuthenticationEvidence,
  type AuthenticationRequirement,
  AuthenticationRevision,
  PendingAuthenticationInvalid,
  SessionConflict,
  SessionInvalid,
  SessionStepUpInvalid,
  SessionUnavailable,
  StaleAuthentication
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import { type Fragment, fragment, parameter } from "effect/sql/Statement"

import { PersistenceMappingError } from "./mappingError.ts"
import type { SessionAuthorityTables, SessionExecution } from "./models/sessionModel.ts"
import { nativeSqlAlias, type NativeSqlTables, type SqlTable } from "./nativeSqlTable.ts"
import { anySqlCondition, exactSqlText } from "./sqlChange.ts"
import { guardSqlitePolicy, type SqlitePolicyValue } from "./sqlitePolicyGuard.ts"
import type { AnyTableModel } from "./tableModel.ts"

/** @internal */
export const sessionUnavailable = () => SessionUnavailable.make({})

/** @internal */
export const invalidSessionState = () =>
  PersistenceMappingError.make({ operation: "decode", cause: "Invalid session authority" })

/** @internal */
export type SessionDomainFailure =
  | SessionConflict
  | SessionInvalid
  | SessionUnavailable
  | SessionStepUpInvalid
  | PendingAuthenticationInvalid
  | StaleAuthentication

const isDomainFailure = (error: unknown): error is SessionDomainFailure =>
  Schema.is(SessionConflict)(error) ||
  Schema.is(SessionInvalid)(error) ||
  Schema.is(SessionUnavailable)(error) ||
  Schema.is(SessionStepUpInvalid)(error) ||
  Schema.is(PendingAuthenticationInvalid)(error) ||
  Schema.is(StaleAuthentication)(error)

/**
 * Only schema-checked domain failures cross the owner boundary; SQL/mapping
 * failures remain Unavailable. The executor preserves every mixed cause reason.
 *
 * @internal
 */
export const sessionFailure = <E>(
  error: E
): Extract<E, SessionDomainFailure> | SessionUnavailable =>
  isDomainFailure(error) ? (error as Extract<E, SessionDomainFailure>) : sessionUnavailable()

/** @internal */
export const normalizeSessionOperation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  reportPersistenceFailure(effect, isDomainFailure, { markReported: true }).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, sessionFailure)))
  )

/** @internal */
export type NativeSessionAuthorityMapping =
  & SessionAuthorityTables<
    AnyTableModel,
    AnyTableModel,
    unknown
  >
  & SessionExecution

/** @internal */
export interface NativeSessionAuthority {
  readonly native: unknown
  readonly row: Record<string, unknown>
  readonly policyValues: ReadonlyArray<SqlitePolicyValue>
  readonly revision: AuthenticationRevision
  readonly requirement: AuthenticationRequirement
  readonly now: number
}

/** @internal */
export const sameSessionRevision = (left: AuthenticationRevision, right: AuthenticationRevision) =>
  left.subjectId === right.subjectId &&
  left.securityRevision === right.securityRevision &&
  left.credentials.length === right.credentials.length &&
  new Set(left.credentials.map((f) => f.credentialId)).size === left.credentials.length &&
  left.credentials.every((f) =>
    right.credentials.some(
      (other) => other.credentialId === f.credentialId && other.revision === f.revision
    )
  )

/**
 * Known-subject joins bind each physical ID column independently. Subject locks
 * precede every credential lock, including inside an application coordinator.
 *
 * @internal
 */
export const makeNativeSessionAuthorityState = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: NativeSessionAuthorityMapping,
  batch = false
) {
  const sql = (yield* SqlClient).withoutTransforms()
  const clockPolicy = yield* AuthenticationClock

  const s = mapping.subject,
    c = mapping.credential

  if (batch) {
    if (!(s.requirementColumns !== undefined)) return yield* invalidSessionState()
  }

  const subject = tables(s.table),
    credential = tables(c.table)

  const joinedSubject = subject.as("session_subject"),
    joinedCredential = credential.as("session_factor")

  const now = tables.expression(mapping.clock.engineNowMillis)
  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })
  const nativeLocks = !batch && sql.onDialectOrElse({ sqlite: () => false, orElse: () => true })

  const exact = (table: SqlTable, key: string, value: unknown) =>
    exactSqlText(sql, table.column(key), table.value(key, value))

  const id = (table: SqlTable, key: string, value: unknown) => sql`${table.column(key)} = ${table.value(key, value)}`

  const activeSubject = (table: SqlTable) => id(table, s.status, s.activeStatusValue)

  if (c.status !== undefined && c.activeStatusValue === undefined) {
    return yield* invalidSessionState()
  }

  const activeCredential = (table: SqlTable) => {
    if (c.status === undefined) return sql`1 = 1`

    return id(table, c.status, c.activeStatusValue)
  }

  const requested = (table: SqlTable, ids: ReadonlyArray<string>) =>
    anySqlCondition(ids.map((value) => exact(table, c.credentialId, value)))

  const decode = Effect.fnUntraced(function*(
    subjectId: SubjectId,
    native: unknown,
    projected: Record<string, unknown>,
    factors: ReadonlyArray<Record<string, unknown>>,
    instant: unknown
  ): Effect.fn.Return<
    NativeSessionAuthority | undefined,
    PersistenceMappingError | Schema.SchemaError
  > {
    const row = subject.decode(projected, "s_")

    if (!((yield* mapping.subjectId.toSubject(row[s.id])) === subjectId)) {
      return yield* invalidSessionState()
    }
    if (!s.isActiveStatus(row[s.status])) return undefined
    const credentials: Array<{ credentialId: string; revision: string }> = []

    for (const factor of factors) {
      if (factor[c.credentialId] === null || factor[c.credentialId] === undefined) continue
      if (!((yield* mapping.subjectId.toSubject(factor[c.subjectId])) === subjectId)) {
        return yield* invalidSessionState()
      }
      if (c.status !== undefined) {
        if (!(c.isActiveStatus?.(factor[c.status]) === true)) return yield* invalidSessionState()
      }

      const value = yield* Schema.decodeUnknownEffect(
        Schema.Struct({ credentialId: Schema.String, revision: Schema.String })
      )({ credentialId: factor[c.credentialId], revision: factor[c.revision] })

      if (credentials.some((other) => other.credentialId === value.credentialId)) {
        return yield* invalidSessionState()
      }
      credentials.push(value)
    }
    if (!(credentials.length <= 64)) return yield* invalidSessionState()

    return {
      native,
      row,
      // Compare the selected SQL representation, without round-tripping through
      // application codecs (for example, JSON whitespace or date precision).
      policyValues: batch
        ? (s.requirementColumns ?? []).map((key) => ({
          column: subject.selectedColumn(key),
          value: fragment([
            parameter(projected[nativeSqlAlias("s_", subject.keys.indexOf(key))])
          ])
        }))
        : [],
      revision: yield* Schema.decodeUnknownEffect(AuthenticationRevision)({
        subjectId,
        securityRevision: row[s.securityRevision],
        credentials: credentials.sort((a, b) => a.credentialId.localeCompare(b.credentialId))
      }),
      requirement: yield* s.decodeRequirement(row),
      now: yield* Schema.decodeEffect(Schema.Int)(Number(instant))
    }
  })

  const read = Effect.fnUntraced(function*(subjectId: SubjectId, locking = false) {
    const native = yield* mapping.subjectId.toNative(subjectId)

    if (!((yield* mapping.subjectId.toSubject(native)) === subjectId)) {
      return yield* invalidSessionState()
    }
    if (locking && nativeLocks) {
      const owners = yield* sql`select ${subject.fields("s_")}, ${now} as engine_now from ${subject.name} where ${
        id(subject, s.id, native)
      } and ${activeSubject(subject)} limit 2 ${lock}`

      if (!(owners.length <= 1)) return yield* invalidSessionState()
      if (owners[0] === undefined) return undefined

      const factors = yield* sql`select ${credential.fields("c_")} from ${credential.name} where ${
        id(credential, c.subjectId, native)
      } and ${activeCredential(credential)} order by ${credential.column(c.credentialId)} limit 65 ${lock}`

      return yield* decode(
        subjectId,
        native,
        owners[0],
        factors.map((row) => credential.decode(row, "c_")),
        owners[0].engine_now
      )
    }

    const rows = yield* sql`select ${joinedSubject.fields("s_")}, ${
      joinedCredential.fields("c_")
    }, ${now} as engine_now from ${joinedSubject.name} left join ${joinedCredential.name} on ${
      id(joinedCredential, c.subjectId, native)
    } and ${activeCredential(joinedCredential)} where ${id(joinedSubject, s.id, native)} and ${
      activeSubject(joinedSubject)
    } limit 65`

    if (rows[0] === undefined) return undefined

    return yield* decode(
      subjectId,
      native,
      rows[0],
      rows.map((row) => joinedCredential.decode(row, "c_")),
      rows[0].engine_now
    )
  })

  const guardPolicy = Effect.fnUntraced(function*(current: NativeSessionAuthority) {
    if (!batch) return
    if (!(s.requirementColumns !== undefined)) return yield* invalidSessionState()

    yield* guardSqlitePolicy({
      name: "session-subject-policy",
      table: subject.name,
      owner: id(subject, s.id, current.native),
      values: current.policyValues
    })
  })

  const authorityCondition = (revision: AuthenticationRevision, native: unknown): Fragment =>
    sql.and([
      sql`exists(select 1 from ${subject.name} where ${id(subject, s.id, native)} and ${
        exact(subject, s.securityRevision, revision.securityRevision)
      } and ${activeSubject(subject)})`,
      sql`(select count(*) from ${credential.name} where ${id(credential, c.subjectId, native)} and ${
        activeCredential(credential)
      }) = ${revision.credentials.length}`,
      ...revision.credentials.map(
        (factor) =>
          sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, native)} and ${
            exact(credential, c.credentialId, factor.credentialId)
          } and ${exact(credential, c.revision, factor.revision)} and ${activeCredential(credential)})`
      )
    ])

  return {
    sql,
    clockPolicy,
    subject,
    credential,
    joinedSubject,
    joinedCredential,
    now,
    lock,
    nativeLocks,
    exact,
    id,
    activeSubject,
    activeCredential,
    requested,
    decode,
    read,
    authorityCondition,
    guardPolicy
  }
})

/**
 * Evaluate freshness at the database sample. The final write also enforces the
 * earliest future boundary at which the same evidence would cease to satisfy.
 *
 * @internal
 */
export const assessSessionAt = Effect.fnUntraced(function*(
  evidence: AuthenticationEvidence,
  requirement: AuthenticationRequirement,
  now: number
) {
  const result = yield* assessAuthentication(evidence, requirement, DateTime.makeUnsafe(now))

  return result
})

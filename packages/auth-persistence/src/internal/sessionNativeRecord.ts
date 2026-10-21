import { AuthenticationClock } from "@effect/auth/Operations"
import { TokenDigest } from "@effect/auth/Schema"
import {
  SecurityRevision,
  SessionAuthenticationProvenance,
  SessionCredentialVersion,
  SessionId,
  SessionMetadata,
  type StatefulSessionRecord
} from "@effect/auth/Sessions"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import type { SubjectIdCodec } from "./models/common.ts"
import type { SessionExecution, StatefulSessionTables } from "./models/sessionModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { invalidSessionState } from "./sessionNativeState.ts"
import { exactSqlText } from "./sqlChange.ts"
import type { AnyTableModel } from "./tableModel.ts"

/** @internal */
export type NativeSessionRecordMapping<Claims> =
  & StatefulSessionTables<
    Claims,
    AnyTableModel,
    unknown,
    unknown
  >
  & Pick<SessionExecution, "clock">
  & { readonly subjectId: SubjectIdCodec<unknown> }

const metadataJson = Schema.encodeSync(Schema.fromJsonString(SessionMetadata))
const provenanceJson = Schema.encodeSync(Schema.fromJsonString(SessionAuthenticationProvenance))

/** @internal */
export const sameSessionRecord = <Claims>(
  left: StatefulSessionRecord<Claims>,
  right: StatefulSessionRecord<Claims>
) =>
  left.digest === right.digest &&
  left.credentialVersion === right.credentialVersion &&
  metadataJson(left) === metadataJson(right) &&
  provenanceJson(left.provenance) === provenanceJson(right.provenance)

/** @internal */
export const makeConditionalSqlInsert = Effect.fnUntraced(function*() {
  const sql = (yield* SqlClient).withoutTransforms()

  return Effect.fnUntraced(function*(
    table: SqlTable,
    values: Readonly<Record<string, unknown>>,
    condition: Fragment
  ) {
    const fields = Object.entries(values).filter(([, value]) => value !== undefined)

    if (fields.length === 0) return yield* invalidSessionState()

    return sql`insert into ${table.name} (${
      sql.join(", ", false)(fields.map(([key]) => table.columnName(key)))
    }) select ${sql.join(", ", false)(fields.map(([key, value]) => table.value(key, value)))} where ${condition}`
  })
})

/**
 * Security columns own live time bounds and commit-time issuedAt adjustments,
 * independently of prepared JSON metadata. Claims/provenance decoding remains consumer-owned.
 *
 * @internal
 */
export const makeNativeSessionRecords = Effect.fnUntraced(function*<Claims>(
  tables: NativeSqlTables,
  mapping: NativeSessionRecordMapping<Claims>
) {
  const sql = (yield* SqlClient).withoutTransforms()
  const { futureToleranceMillis } = yield* AuthenticationClock

  const s = mapping.session,
    table = tables(s.table),
    now = tables.expression(mapping.clock.engineNowMillis)

  const exact = (t: SqlTable, key: string, value: unknown) => exactSqlText(sql, t.column(key), t.value(key, value))

  const millis = (t: SqlTable, key: string) => tables.expression(mapping.clock.toMillis(t.column(key)))

  const live = (t: SqlTable) =>
    sql.and([
      sql`${millis(t, s.issuedAt)} <= ${now} + ${futureToleranceMillis}`,
      sql`${millis(t, s.issuedAt)} < ${millis(t, s.expiresAt)}`,
      sql`${millis(t, s.expiresAt)} > ${now}`,
      sql`${millis(t, s.absoluteExpiresAt)} >= ${millis(t, s.expiresAt)}`
    ])

  const decode = Effect.fnUntraced(function*(row: Record<string, unknown>) {
    const decoded = yield* s.decode(row)
    const subjectId = yield* mapping.subjectId.toSubject(row[s.subjectId])
    const sessionId = yield* mapping.sessionId.toSession(row[s.sessionId])
    const digest = yield* Schema.decodeUnknownEffect(TokenDigest)(row[s.digest])
    const revision = yield* Schema.decodeUnknownEffect(SecurityRevision)(row[s.securityRevision])
    const issuedAt = DateTime.makeUnsafe(mapping.clock.decodeInstant(row[s.issuedAt]))
    const expiresAt = mapping.clock.decodeInstant(row[s.expiresAt])
    const absolute = mapping.clock.decodeInstant(row[s.absoluteExpiresAt])

    if (
      !(
        decoded.subjectId === subjectId &&
        decoded.sessionId === sessionId &&
        decoded.digest === digest &&
        decoded.securityRevision === revision &&
        DateTime.toEpochMillis(decoded.expiresAt) === expiresAt &&
        DateTime.toEpochMillis(decoded.absoluteExpiresAt) === absolute
      )
    ) {
      return yield* invalidSessionState()
    }
    yield* Schema.decodeEffect(SessionId)(sessionId)
    yield* Schema.decodeEffect(SessionCredentialVersion)(decoded.credentialVersion)

    return { ...decoded, issuedAt }
  })

  const owner = Effect.fnUntraced(function*(
    record: Pick<StatefulSessionRecord<Claims>, "subjectId" | "sessionId" | "digest">
  ) {
    const nativeSubject = yield* mapping.subjectId.toNative(record.subjectId),
      nativeSession = yield* mapping.sessionId.toNative(record.sessionId)

    return sql.and([
      sql`${table.column(s.subjectId)} = ${table.value(s.subjectId, nativeSubject)}`,
      sql`${table.column(s.sessionId)} = ${table.value(s.sessionId, nativeSession)}`,
      exact(table, s.digest, record.digest)
    ])
  })

  // These are the semantic values supplied by the session encoder for this
  // write, not an observed whole-row snapshot or unrelated application columns.
  const encodedCondition = (values: Readonly<Record<string, unknown>>) =>
    sql.and(
      Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) =>
          value === null
            ? sql`${table.column(key)} is null`
            : Predicate.isString(value)
            ? exact(table, key, value)
            : sql`${table.column(key)} = ${table.value(key, value)}`
        )
    )

  const read = Effect.fnUntraced(function*(digest: TokenDigest) {
    const rows = yield* sql`select ${table.fields("session_")} from ${table.name} where ${
      exact(table, s.digest, digest)
    } and ${live(table)} limit 2`

    if (!(rows.length <= 1)) return yield* invalidSessionState()

    return rows[0] === undefined ? undefined : yield* decode(table.decode(rows[0], "session_"))
  })

  return { sql, s, table, now, exact, millis, live, decode, owner, read, encodedCondition }
})

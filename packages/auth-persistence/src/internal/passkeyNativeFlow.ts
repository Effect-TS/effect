import * as Passkey from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import type { PasskeyCeremonyMapping } from "./models/passkeyModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { passkeyMatchesAccess, validPasskeyCeremony } from "./passkeyPolicy.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import { cleanupSqlRows } from "./sqlCleanup.ts"
import { appendSqlBatchStatement } from "./sqlCommit.ts"
import type { TableModel } from "./tableModel.ts"

/** @internal */
export const passkeyCeremonyJson = Schema.fromJsonString(Passkey.PasskeyCeremony)

// The physical expression compiler validates this adapter boundary.
// oxlint-disable-next-line no-explicit-any
/** @internal */
export type PasskeyNativeCeremonyMapping = PasskeyCeremonyMapping<TableModel, any>

/**
 * One set of challenge statements serves native transactions and fixed D1 plans.
 *
 * @internal
 */
export const makePasskeyNativeFlow = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: PasskeyNativeCeremonyMapping
) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const flow = tables(mapping.flow.table)
  const now = tables.expression(mapping.clock.engineNowMillis)
  const millis = (expression: Fragment) => tables.expression(mapping.clock.toMillis(expression))

  const exact = (key: string, value: unknown) => exactSqlText(sql, flow.column(key), flow.value(key, value))

  const module = (moduleId: string) => exact(mapping.flow.moduleId, moduleId)
  const validModule = (moduleId: string) => moduleId === mapping.moduleId

  const access = (input: Passkey.PasskeyAccess, ceremony?: Passkey.PasskeyCeremony) =>
    sql.and([
      module(input.moduleId),
      exact(mapping.flow.purpose, input.purpose),
      exact(mapping.flow.flowId, input.flowId),
      exact(mapping.flow.requestBindingVerifier, input.requestBindingVerifier),
      sql`${flow.column(mapping.flow.requestBindingExpiresAt)} = ${
        flow.value(
          mapping.flow.requestBindingExpiresAt,
          mapping.clock.encodeInstant(input.requestBindingExpiresAtMillis)
        )
      }`,
      sql`${millis(flow.column(mapping.flow.expiresAt))} > ${now}`,
      sql`${millis(flow.column(mapping.flow.requestBindingExpiresAt))} > ${now}`,
      ...(ceremony === undefined
        ? []
        : [
          exact(mapping.flow.snapshot, Schema.encodeSync(passkeyCeremonyJson)(ceremony)),
          sql`${flow.column(mapping.flow.issuedAt)} = ${
            flow.value(mapping.flow.issuedAt, mapping.clock.encodeInstant(ceremony.issuedAtMillis))
          }`,
          sql`${flow.column(mapping.flow.expiresAt)} = ${
            flow.value(mapping.flow.expiresAt, mapping.clock.encodeInstant(ceremony.expiresAtMillis))
          }`
        ])
    ])

  const insert = (ceremony: Passkey.PasskeyCeremony, extra: Readonly<Record<string, unknown>> = {}) => {
    const values = {
      ...mapping.flow.encodeInsert({ ceremony }),
      ...extra,
      [mapping.flow.moduleId]: ceremony.moduleId,
      [mapping.flow.flowId]: ceremony.flowId,
      [mapping.flow.purpose]: ceremony.purpose,
      [mapping.flow.snapshot]: Schema.encodeSync(passkeyCeremonyJson)(ceremony),
      [mapping.flow.requestBindingVerifier]: ceremony.requestBindingVerifier,
      [mapping.flow.requestBindingExpiresAt]: mapping.clock.encodeInstant(
        ceremony.requestBindingExpiresAtMillis
      ),
      [mapping.flow.issuedAt]: mapping.clock.encodeInstant(ceremony.issuedAtMillis),
      [mapping.flow.expiresAt]: mapping.clock.encodeInstant(ceremony.expiresAtMillis)
    }

    return sql`${flow.insert(values)} ${
      sql.onDialectOrElse({ mysql: () => sql``, orElse: () => sql`on conflict do nothing` })
    }`
  }

  const consume = (
    input: Passkey.PasskeyAccess,
    ceremony: Passkey.PasskeyCeremony,
    condition: Fragment = sql`true`
  ) => sql`delete from ${flow.name} where ${access(input, ceremony)} and ${condition}`

  const context = Effect.fnUntraced(function*(input: Passkey.PasskeyAccess) {
    if (!validModule(input.moduleId)) return undefined

    const rows = yield* sql`select ${flow.fields("flow_")} from ${flow.name} where ${access(input)}`

    if (rows.length !== 1) return undefined
    const row = flow.decode(rows[0]!, "flow_")

    const ceremony = yield* Schema.decodeUnknownEffect(passkeyCeremonyJson)(
      row[mapping.flow.snapshot]
    )

    return validPasskeyCeremony(ceremony) &&
        passkeyMatchesAccess(ceremony, input) &&
        mapping.clock.decodeInstant(row[mapping.flow.issuedAt]) === ceremony.issuedAtMillis &&
        mapping.clock.decodeInstant(row[mapping.flow.expiresAt]) === ceremony.expiresAtMillis
      ? ceremony
      : undefined
  })

  const cleanup = (moduleId: string, limit: number, batch = false) =>
    cleanupSqlRows(
      [
        {
          table: flow,
          keys: [mapping.flow.moduleId, mapping.flow.flowId],
          due: sql`${module(moduleId)} and ${millis(flow.column(mapping.flow.expiresAt))} <= ${now}`,
          order: [flow.column(mapping.flow.expiresAt), flow.column(mapping.flow.flowId)]
        }
      ],
      limit,
      batch
    )

  const stage = Effect.fnUntraced(function*(statement: Fragment, count: number) {
    yield* appendSqlBatchStatement(sql`${statement}`)
    yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${count}`))
  })

  return {
    sql,
    flow,
    now,
    millis,
    exact,
    module,
    validModule,
    access,
    insert,
    consume,
    absent: (input: Passkey.PasskeyAccess) =>
      sql`not exists(select 1 from ${flow.name} where ${module(input.moduleId)} and ${
        exact(mapping.flow.flowId, input.flowId)
      })`,
    context,
    cleanup,
    stage,
    change: (statement: Fragment) => executeSqlChange(sql, statement)
  }
})

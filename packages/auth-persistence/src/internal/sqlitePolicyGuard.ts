import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { appendSqlBatchStatement, registerSqlBatchPostcondition } from "./sqlCommit.ts"

/** @internal */
export interface SqlitePolicyValue {
  readonly column: Fragment
  readonly value: Fragment
}

/**
 * Check original values before writes and at the end of the same atomic batch.
 * Small groups bound parameters and expression depth without expanding retained
 * values into hex/JSON. BINARY preserves text bytes; IS also compares NULLs.
 *
 * @internal
 */
export const guardSqlitePolicy = Effect.fnUntraced(function*(input: {
  readonly name: string
  readonly table: Fragment
  readonly owner: Fragment
  readonly values: ReadonlyArray<SqlitePolicyValue>
}) {
  const sql = (yield* SqlClient).withoutTransforms()

  for (const values of Array.chunksOf(input.values, 32)) {
    const matches = sql.and(
      values.map(({ column, value }) => sql`${column} collate binary is ${value}`)
    )

    const condition = sql`exists(select 1 from ${input.table} where ${input.owner} and ${matches})`
    const statement =
      sql`select case when ${condition} then 1 else json_extract('[]', '$[auth-batch-precondition]') end as valid`

    yield* appendSqlBatchStatement(statement)
    yield* registerSqlBatchPostcondition({ name: input.name, statement })
  }
})

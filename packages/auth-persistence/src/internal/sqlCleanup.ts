import { CleanupLimit, CleanupResult } from "@effect/auth/Persistence"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import type { SqlTable } from "./nativeSqlTable.ts"
import { executeSqlChange } from "./sqlChange.ts"
import { appendSqlBatchStatement } from "./sqlCommit.ts"

/**
 * A mapped row key and its strategy-owned retention predicate are the entire
 * cleanup authority. All tables share the same remaining row budget.
 *
 * @internal
 */
export interface SqlCleanupTable {
  readonly table: SqlTable
  readonly keys: readonly [string, ...Array<string>]
  readonly due: Fragment
  readonly order: ReadonlyArray<Fragment>
  /** Internal capability: managed SQLite pending rows with a stable built-in
   * clock, globally unique non-null BINARY keys, and no table triggers. */
  readonly selectedKeysOwnDeletion?: true
}

/** @internal */
export const cleanupSqlRows = Effect.fnUntraced(function*(
  candidates: ReadonlyArray<SqlCleanupTable>,
  requested: CleanupLimit,
  batch = false
) {
  const limit = yield* Schema.decodeEffect(CleanupLimit)(requested)
  const sql = (yield* SqlClient).withoutTransforms()
  let removed = 0

  for (const candidate of candidates) {
    const remaining = limit - removed

    if (remaining === 0) break
    const { table, keys, due } = candidate
    const aliases = keys.map((_, index) => sql.literal(`cleanup_key_${index}`))
    const selection = sql`select ${
      sql.join(", ", false)(keys.map((key, index) => sql`${table.column(key)} as ${aliases[index]!}`))
    } from ${table.name} where ${due} order by ${
      sql.join(", ", false)(candidate.order.length === 0 ? keys.map(table.column) : candidate.order)
    } limit ${remaining}`

    // An uncorrelated IN selection materializes the bounded key set before
    // deletion, including SQLite's self-table case and composite tombstone keys.
    const rowKey = keys.length === 1
      ? table.column(keys[0])
      : sql`(${sql.join(", ", false)(keys.map(table.column))})`

    const deletion = sql`delete from ${table.name} where ${
      candidate.selectedKeysOwnDeletion === true ? sql`` : sql`${due} and `
    }${rowKey} in (select ${sql.join(", ", false)(aliases)} from (${selection}) as cleanup_candidates)`

    if (batch) {
      const planned = (yield* sql`${selection}`).length

      yield* appendSqlBatchStatement(deletion)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${planned}`))
      removed += planned
    } else removed += yield* executeSqlChange(sql, deletion)
  }

  return yield* Schema.decodeEffect(CleanupResult)({ removed, hasMore: removed === limit })
})

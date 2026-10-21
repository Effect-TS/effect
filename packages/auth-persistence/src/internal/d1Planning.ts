import type { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

/**
 * A false predicate aborts the current D1 batch; checking its result after
 * batch completion would be too late to roll the protected mutation back.
 *
 * @internal
 */
export const sqlBatchAssertion = (sql: SqlClient, condition: Fragment) =>
  sql`select case when ${condition} then 1 else json_extract('[]', '$[auth-batch-precondition]') end as valid`

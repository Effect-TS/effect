import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import { type Fragment, join } from "effect/sql/Statement"

/**
 * Native row counts are the authority for conditional writes. MySQL exposes
 * its result header; PostgreSQL and SQLite return one row for every match.
 *
 * @internal
 */
export const executeSqlChange = (
  sql: SqlClient,
  query: Fragment
): Effect.Effect<number, SqlError | Schema.SchemaError> =>
  sql.onDialectOrElse({
    mysql: () =>
      sql`${query}`.raw.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ affectedRows: Schema.Int }))),
        Effect.map((result) => result.affectedRows)
      ),
    orElse: () => sql`${query} returning 1 as changed`.pipe(Effect.map((rows) => rows.length))
  })

/**
 * Effect renders an empty OR as `1=1`; an empty set of alternatives matches nothing.
 *
 * @internal
 */
export const anySqlCondition: (conditions: ReadonlyArray<Fragment>) => Fragment = join(
  " OR ",
  true,
  "1 = 0"
)

/**
 * Exact text comparison and ordering, independent of the column's collation.
 *
 * @internal
 */
export const sqlTextBytes = Effect.fnUntraced(function*(
  value: Fragment
): Effect.fn.Return<Fragment, never, SqlClient> {
  const sql = (yield* SqlClient).withoutTransforms()

  return sql.onDialectOrElse({
    mysql: () => sql`binary ${value}`,
    pg: () => sql`convert_to(cast(${value} as text), 'UTF8')`,
    orElse: () => sql`cast(${value} as blob)`
  })
})

/**
 * Keep the indexed predicate and reject collation aliases of security tokens.
 *
 * @internal
 */
export const exactSqlText = (sql: SqlClient, left: Fragment, right: Fragment) =>
  sql.and([
    sql`${left} = ${right}`,
    sql.onDialectOrElse({
      mysql: () => sql`binary ${left} = binary ${right}`,
      pg: () => sql`convert_to(cast(${left} as text), 'UTF8') = convert_to(cast(${right} as text), 'UTF8')`,
      orElse: () => sql`cast(${left} as blob) = cast(${right} as blob)`
    })
  ])

import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import { SqlClient } from "effect/sql/SqlClient"

import type { MappingInput } from "./configuration.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { ProofClock } from "./models/proofModel.ts"
import { compileSqlExpression } from "./sqlExpression.ts"
import type { SqlExpression } from "./tableModel.ts"

/**
 * Managed storage supports epoch milliseconds or canonical ISO text.
 *
 * @internal
 */
export const makeStorageClock = Effect.fnUntraced(function*(storage: MappingInput) {
  const sql = (yield* SqlClient).withoutTransforms()
  const encoded = storage.encodeInstant(0)
  const numeric = Predicate.isNumber(encoded)

  if (!numeric && encoded !== "1970-01-01T00:00:00.000Z") {
    return yield* PersistenceMappingError.make({
      operation: "mapping",
      cause: "Unsupported managed timestamp representation"
    })
  }

  const clock: ProofClock<SqlExpression> = {
    encodeInstant: storage.encodeInstant,
    decodeInstant: storage.decodeInstantSync,
    engineNowMillis: sql.onDialectOrElse({
      pg: () => sql`cast(extract(epoch from clock_timestamp()) * 1000 as bigint)`,
      mysql: () => sql`cast(unix_timestamp(current_timestamp(3)) * 1000 as signed)`,
      orElse: () => sql`cast(round((julianday('now') - 2440587.5) * 86400000) as integer)`
    }),
    toMillis: (expression) => {
      const value = compileSqlExpression(sql, expression)

      return numeric
        ? value
        : sql.onDialectOrElse({
          pg: () => sql`cast(extract(epoch from cast(${value} as timestamptz)) * 1000 as bigint)`,
          mysql: () => sql`cast(unix_timestamp(str_to_date(${value}, '%Y-%m-%dT%H:%i:%s.%fZ')) * 1000 as signed)`,
          orElse: () => sql`cast(round((julianday(${value}) - 2440587.5) * 86400000) as integer)`
        })
    },
    fromMillis: (expression) => {
      const value = compileSqlExpression(sql, expression)

      return numeric
        ? value
        : sql.onDialectOrElse({
          pg: () => sql`to_char(to_timestamp((${value}) / 1000.0) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
          mysql: () =>
            sql`concat(date_format(from_unixtime((${value}) / 1000.0), '%Y-%m-%dT%H:%i:%s.'), lpad(mod(${value}, 1000), 3, '0'), 'Z')`,
          orElse: () => sql`strftime('%Y-%m-%dT%H:%M:%fZ', (${value}) / 1000.0, 'unixepoch')`
        })
    }
  }

  return clock
})

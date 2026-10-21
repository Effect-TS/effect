import {
  PersistenceMappingError,
  storageKeyPlans,
  type StorageValidation,
  validateStorageBatch
} from "@effect/auth-persistence/Adapter"
import { reportAuthDiagnostic } from "@effect/auth/Persistence"
import { getTableColumns, getTableName, is, Table } from "drizzle-orm"
import { getTableConfig as getMysqlTableConfig, MySqlTable } from "drizzle-orm/mysql-core"
import { getTableConfig as getPgTableConfig, PgTable } from "drizzle-orm/pg-core"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import { SqlClient } from "effect/sql/SqlClient"

import { NativeDatabase } from "./nativeDatabase.ts"

const invalidMapping = (cause: unknown) => PersistenceMappingError.make({ operation: "mapping", cause })

/**
 * Validate at acquisition using the root database supplied by the adapter.
 *
 * @internal
 */
export const validateDrizzleStorage = Effect.fnUntraced(
  function*(mapping: unknown) {
    const physical = yield* Effect.try({
      try: () =>
        storageKeyPlans(mapping, (table) => {
          if (!is(table, Table)) {
            return Result.fail(
              PersistenceMappingError.make({
                operation: "mapping",
                cause: "Expected a SQL table"
              })
            )
          }

          return Result.succeed(getTableColumns(table))
        }),
      catch: invalidMapping
    }).pipe(Effect.flatMap(Effect.fromResult), Effect.mapError(invalidMapping))

    const { $client: client } = yield* NativeDatabase

    const batches = new Map<"pg" | "mysql" | "sqlite", Array<StorageValidation>>()

    for (const plan of physical) {
      if (!is(plan.table, Table)) {
        return yield* PersistenceMappingError.make({
          operation: "mapping",
          cause: "Missing storage table"
        })
      }
      const pg = is(plan.table, PgTable)
      const mysql = is(plan.table, MySqlTable)

      const schema = pg
        ? getPgTableConfig(plan.table).schema
        : mysql
        ? getMysqlTableConfig(plan.table).schema
        : undefined

      const columns = getTableColumns(plan.table)

      const dialect = pg ? "pg" : mysql ? "mysql" : "sqlite"
      const batch = batches.get(dialect) ?? []

      batch.push({
        table: {
          name: getTableName(plan.table),
          ...(schema === undefined ? {} : { schema }),
          columns: Object.fromEntries(plan.keys.map((key) => [key, { name: columns[key]!.name }]))
        },
        required: [plan.keys]
      })
      batches.set(dialect, batch)
    }
    for (const [dialect, requirements] of batches) {
      yield* validateStorageBatch(dialect, requirements).pipe(
        Effect.provideService(SqlClient, client),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, invalidMapping)))
      )
    }
  },
  Effect.tapError(() => reportAuthDiagnostic("persistence-validation", "mapping"))
)

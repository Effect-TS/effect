import { reportAuthDiagnostic } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as SqlClient from "effect/sql/SqlClient"

import { PersistenceMappingError } from "./mappingError.ts"
import { Table } from "./sqlTable.ts"
import { storageKeyPlans } from "./storagePlans.ts"
import { type StorageValidation, validateStorageBatch } from "./storageValidation.ts"

const invalidMapping = () =>
  PersistenceMappingError.make({ operation: "mapping", cause: "Invalid storage key mapping" })

/**
 * Check declared mappings against physical keys before executing OAuth operations.
 *
 * @internal
 */
export const validateSqlStorage = Effect.fnUntraced(
  function*(mapping: unknown) {
    const plans = yield* Effect.try({
      try: () =>
        storageKeyPlans(mapping, (table) => {
          if (!(table instanceof Table)) {
            return Result.fail(
              PersistenceMappingError.make({
                operation: "mapping",
                cause: "Expected a SQL table"
              })
            )
          }

          return Result.succeed(table.columns)
        }),
      catch: invalidMapping
    }).pipe(Effect.flatMap(Effect.fromResult), Effect.mapError(invalidMapping))

    const client = yield* SqlClient.SqlClient

    const dialect = client.onDialectOrElse({
      pg: () => "pg" as const,
      sqlite: () => "sqlite" as const,
      orElse: () => undefined
    })

    if (dialect === undefined) {
      return yield* PersistenceMappingError.make({
        operation: "mapping",
        cause: "OAuth persistence requires PostgreSQL or SQLite"
      })
    }
    const validations: Array<StorageValidation> = []

    for (const plan of plans) {
      if (!(plan.table instanceof Table)) {
        return yield* PersistenceMappingError.make({
          operation: "mapping",
          cause: "Expected a SQL table"
        })
      }
      validations.push({
        table: {
          name: plan.table.name,
          ...(plan.table.schema === undefined ? {} : { schema: plan.table.schema }),
          columns: Object.fromEntries(
            Object.entries(plan.table.columns).map(([key, column]) => [key, column.options])
          )
        },
        required: [plan.keys]
      })
    }
    yield* validateStorageBatch(dialect, validations).pipe(
      Effect.provideService(SqlClient.SqlClient, client),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "mapping", cause: error }))
        )
      )
    )
  },
  Effect.tapError(() => reportAuthDiagnostic("persistence-validation", "mapping"))
)

import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Order from "effect/Order"
import { ConstraintError, SqlError, UniqueViolation } from "effect/sql/SqlError"

import { ClickHouseNativeSqlClient } from "./ClickHouseNativeSqlClient.ts"

export interface ClickHouseNativeMigration {
  readonly id: number
  readonly name: string
  readonly statements: ReadonlyArray<string>
}

export interface ClickHouseNativeMigratorOptions {
  readonly migrations: ReadonlyArray<ClickHouseNativeMigration>
  readonly table?: string
}

const defaultTable = "effect_clickhouse_native_migrations"

const invalidMigration = (message: string, operation: string): SqlError =>
  SqlError.make({ reason: ConstraintError.make({ cause: new Error(message), message, operation }) })

const identifier = (value: string): Effect.Effect<string, SqlError> =>
  value.split(".").every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))
    ? Effect.succeed(value.split(".").map((part) => `\`${part}\``).join("."))
    : invalidMigration(`Invalid ClickHouse migrations table identifier: ${value}`, "migrator.identifier")

const literal = (value: string): string => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`

const validate = (
  migrations: ReadonlyArray<ClickHouseNativeMigration>
): Effect.Effect<ReadonlyArray<ClickHouseNativeMigration>, SqlError> => {
  const ids = migrations.map((migration) => migration.id)
  const duplicate = ids.some((id, index) => ids.indexOf(id) !== index)
  const invalid = migrations.some(
    (migration) => !Number.isSafeInteger(migration.id) || migration.id <= 0 || migration.name.length === 0
  )

  return duplicate
    ? SqlError.make({
      reason: UniqueViolation.make({
        cause: new Error("Found duplicate migration ids"),
        constraint: "migration_id",
        message: "Found duplicate migration ids",
        operation: "migrator.validate"
      })
    })
    : invalid
    ? invalidMigration("Migration ids must be positive safe integers and names must not be empty", "migrator.validate")
    : Effect.succeed(Array.sortWith(migrations, (migration) => migration.id, Order.Number))
}

export const run = (
  options: ClickHouseNativeMigratorOptions
): Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError,
  ClickHouseNativeSqlClient
> =>
  Effect.gen(function*() {
    const client = yield* ClickHouseNativeSqlClient
    const migrations = yield* validate(options.migrations)
    const table = yield* identifier(options.table ?? defaultTable)
    yield* client.execute(`CREATE TABLE IF NOT EXISTS ${table} (
      migration_id UInt64,
      name String,
      created_at DateTime DEFAULT now()
    ) ENGINE = ReplacingMergeTree ORDER BY migration_id`)
    const applied = yield* client.execute(`SELECT migration_id, name FROM ${table} ORDER BY migration_id`)
    const appliedIds = applied.map((migration) => Number(migration.migration_id))
    const pending = migrations.filter((migration) => !appliedIds.includes(migration.id))

    yield* Effect.forEach(
      pending,
      (migration) =>
        Effect.forEach(
          migration.statements,
          (statement) => client.execute(statement),
          { concurrency: "unbounded", discard: true }
        ).pipe(
          Effect.andThen(
            client.execute(
              `INSERT INTO ${table} (migration_id, name) SELECT toUInt64(${migration.id}), ${literal(migration.name)}`
            ).pipe(Effect.asVoid)
          )
        ),
      { concurrency: "unbounded", discard: true }
    )

    return pending.map((migration) => [migration.id, migration.name] as const)
  })

export const layer = (
  options: ClickHouseNativeMigratorOptions
): Layer.Layer<
  never,
  SqlError,
  ClickHouseNativeSqlClient
> => run(options).pipe(Layer.effectDiscard)

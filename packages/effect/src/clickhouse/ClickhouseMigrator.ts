/**
 * Sequential migrations for ClickHouse, with a MergeTree history table.
 *
 * @since 4.0.0
 */
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Migrator from "../sql/Migrator.ts"
import type * as Client from "../sql/SqlClient.ts"
import type { SqlError } from "../sql/SqlError.ts"
import * as Statement from "../sql/Statement.ts"
import { ClickhouseClient } from "./ClickhouseClient.ts"

/**
 * @since 4.0.0
 */
export * from "../sql/Migrator.ts"

/**
 * Runs pending ClickHouse migrations and records each successful migration.
 *
 * **Gotchas**
 *
 * Run one migrator at a time. ClickHouse has no unique constraint locking or
 * transactional DDL rollback; a failed migration may have applied some changes.
 * Schema dumps are not supported.
 *
 * @category running
 * @since 4.0.0
 */
export const run = Effect.fnUntraced(function*<R>(options: Migrator.MigratorOptions<R>): Effect.fn.Return<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  ClickhouseClient | Client.SqlClient | R
> {
  if (options.schemaDirectory !== undefined) {
    return yield* Effect.fail(
      new Migrator.MigrationError({ kind: "BadState", message: "ClickHouse migrations do not support schema dumps" })
    )
  }
  const sql = yield* ClickhouseClient
  const table = options.table ?? "effect_sql_migrations"
  const escaped = Statement.defaultEscape("\"")(table)
  const migrations = [...(yield* options.loader)].sort(([a], [b]) => a - b)
  if (new Set(migrations.map(([id]) => id)).size !== migrations.length) {
    return yield* Effect.fail(
      new Migrator.MigrationError({ kind: "Duplicates", message: "Found duplicate migration ids" })
    )
  }
  if (migrations.some(([id]) => !Number.isInteger(id) || id < 1 || id > 4294967295)) {
    return yield* Effect.fail(
      new Migrator.MigrationError({
        kind: "BadState",
        message: "ClickHouse migration ids must be positive UInt32 integers"
      })
    )
  }
  yield* sql.asCommand(sql.unsafe(
    "CREATE TABLE IF NOT EXISTS " + escaped +
      " (migration_id UInt32, name String, created_at DateTime DEFAULT now()) ENGINE = MergeTree ORDER BY migration_id"
  ))
  const history = yield* sql.unsafe<{ migration_id: number; name: string }>(
    "SELECT migration_id, name FROM " + escaped + " ORDER BY migration_id"
  ).withoutTransform
  if (new Set(history.map((entry) => entry.migration_id)).size !== history.length) {
    return yield* Effect.fail(
      new Migrator.MigrationError({ kind: "BadState", message: "ClickHouse migration history contains duplicate ids" })
    )
  }
  const latest = history.reduce((maximum, entry) => Math.max(maximum, entry.migration_id), 0)
  const applied: Array<readonly [number, string]> = []
  for (const [id, name, load] of migrations) {
    if (id <= latest) continue
    const loaded: unknown = yield* load.pipe(
      Effect.mapError((cause) =>
        new Migrator.MigrationError({
          kind: "ImportError",
          message: "Failed to load migration " + id + "_" + name,
          cause
        })
      )
    )
    const migration = Effect.isEffect(loaded)
      ? loaded
      : typeof loaded === "object" && loaded !== null && "default" in loaded
      ? loaded.default
      : undefined
    if (!Effect.isEffect(migration)) {
      return yield* Effect.fail(
        new Migrator.MigrationError({
          kind: "ImportError",
          message: "Migration must export an Effect: " + id + "_" + name
        })
      )
    }
    yield* (migration as Effect.Effect<unknown, unknown, Client.SqlClient>).pipe(
      Effect.mapError((cause) =>
        new Migrator.MigrationError({ kind: "Failed", message: "Migration failed: " + id + "_" + name, cause })
      )
    )
    yield* sql.insertQuery({ table, values: [{ migration_id: id, name }] })
    applied.push([id, name])
  }
  return applied
})

/**
 * Runs ClickHouse migrations when the layer is constructed.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<never, Migrator.MigrationError | SqlError, ClickhouseClient | Client.SqlClient | R> =>
  Layer.effectDiscard(run(options))

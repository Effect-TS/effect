/**
 * Utilities for applying Effect SQL migrations to Microsoft SQL Server.
 *
 * This module re-exports the shared `Migrator` loaders and error types, then
 * provides `run` and `layer` helpers for applying ordered migrations through
 * the current SQL Server `SqlClient`. `run` returns the applied migration IDs
 * and names, while `layer` runs migrations during layer construction and
 * provides no services.
 *
 * @since 4.0.0
 */
import type * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Migrator from "../sql/Migrator.ts"
import type * as Client from "../sql/SqlClient.ts"
import type { SqlError } from "../sql/SqlError.ts"

/**
 * @since 4.0.0
 */
export * from "../sql/Migrator.ts"

/**
 * Runs SQL migrations using the configured `SqlClient`, returning the migrations that were applied.
 *
 * @category running
 * @since 4.0.0
 */
export const run: <R>(
  options: Migrator.MigratorOptions<R>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError | Migrator.MigrationError,
  Client.SqlClient | R
> = Migrator.make({})

/**
 * Creates a layer that runs the configured SQL migrations during layer construction.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<never, SqlError | Migrator.MigrationError, Client.SqlClient | R> => Layer.effectDiscard(run(options))

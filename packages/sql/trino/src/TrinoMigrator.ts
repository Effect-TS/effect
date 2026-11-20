/**
 * Trino adapter for the shared Effect SQL migration runner.
 *
 * This module re-exports the common `Migrator` loaders and error types, then
 * provides `run` and `layer` helpers that apply ordered migrations through the
 * current Trino `SqlClient`. Migrations run without a transaction, because
 * most Trino connectors only accept writes in autocommit mode, and each one is
 * recorded only after it succeeds.
 *
 * @stability unstable
 * @since 4.1.5
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Migrator from "effect/sql/Migrator"
import type * as Client from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"

/**
 * @since 4.1.5
 */
export * from "effect/sql/Migrator"
export {
  /**
   * @stability unstable
   * @category loaders
   * @since 4.1.5
   */
  fromFileSystem
} from "effect/sql/MigratorFileSystem"

/**
 * Runs SQL migrations for Trino using the supplied migrator options and
 * returns the applied migration IDs and names.
 *
 * @stability unstable
 * @category running
 * @since 4.1.5
 */
export const run: <R2 = never>(
  { loader, schemaDirectory, table }: Migrator.MigratorOptions<R2>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  Client.SqlClient | R2
> = Migrator.make({})

/**
 * Creates a layer that runs the configured Trino migrations during layer
 * construction and provides no services.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  Migrator.MigrationError | SqlError,
  Client.SqlClient | R
> => Layer.effectDiscard(run(options))

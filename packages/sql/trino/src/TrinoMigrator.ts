/**
 * Trino adapter for the shared Effect SQL migration runner.
 *
 * This module re-exports the common `Migrator` loaders and error types, then
 * provides `run` and `layer` helpers that apply ordered migrations through the
 * current Trino `SqlClient`. Trino connectors do not run DDL and writes across
 * several statements in one transaction, so each migration runs on its own and
 * is recorded only after it succeeds.
 *
 * @stability unstable
 * @since 4.2.0
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Migrator from "effect/sql/Migrator"
import type * as Client from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"

/**
 * @since 4.2.0
 */
export * from "effect/sql/Migrator"
export {
  /**
   * @stability unstable
   * @category loaders
   * @since 4.2.0
   */
  fromFileSystem
} from "effect/sql/MigratorFileSystem"

/**
 * Runs SQL migrations through the current Trino `SqlClient` and returns the
 * applied migration IDs and names.
 *
 * **Gotchas**
 *
 * The migrations table name is unqualified, so the client's session needs a
 * catalog and schema whose connector supports `CREATE TABLE` and `INSERT`,
 * such as `memory` or `iceberg`; set them with `catalog` and `schema` in the
 * client configuration.
 *
 * @stability unstable
 * @category running
 * @since 4.2.0
 */
export const run: <R2 = never>(
  options: Migrator.MigratorOptions<R2>
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
 * @since 4.2.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<never, Migrator.MigrationError | SqlError, Client.SqlClient | R> => Layer.effectDiscard(run(options))

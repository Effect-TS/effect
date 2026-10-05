/**
 * Migration helpers for projects using the native MySQL SQL client.
 *
 * @since 4.0.0
 */
import type * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Migrator from "../sql/Migrator.ts"
import type * as SqlClient from "../sql/SqlClient.ts"
import type { SqlError } from "../sql/SqlError.ts"
/**
 * @since 4.0.0
 */
export * from "../sql/Migrator.ts"
/**
 * Runs pending MySQL migrations through the current SQL client.
 *
 * @category running
 * @since 4.0.0
 */
export const run: <R>(
  options: Migrator.MigratorOptions<R>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  SqlClient.SqlClient | R
> = Migrator.make({})
/**
 * Runs pending MySQL migrations during layer construction.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<never, Migrator.MigrationError | SqlError, SqlClient.SqlClient | R> => Layer.effectDiscard(run(options))

/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/Client"
import type { SqlError } from "@effect/sql/Error"
import * as Migrator from "@effect/sql/Migrator"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 */
export * from "@effect/sql/Migrator"

/**
 * @category constructor
 * @since 1.0.0
 */
export const run: <R>(
  options: Migrator.MigratorOptions<R>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError | Migrator.MigrationError,
  Client.Client | R
> = Migrator.make({})

/**
 * @category constructor
 * @since 1.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<never, SqlError | Migrator.MigrationError, R | Client.Client> => Layer.effectDiscard(run(options))

import * as Effect from "../../Effect.ts"
import * as Migrator from "../../sql/Migrator.ts"

/** @internal */
export const failOnMigrationDefect = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Effect.Effect<A, E | Migrator.MigrationError, R> =>
  // `Migrator.make` reports an error raised inside a migration as a
  // `MigrationError` defect. Fail with it instead, leaving other defects.
  Effect.catchDefect(
    self,
    (defect) => defect instanceof Migrator.MigrationError ? Effect.fail(defect) : Effect.die(defect)
  )

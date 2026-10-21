import { PersistenceConfigurationError, PersistenceMappingError } from "@effect/auth-persistence/Adapter"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

/**
 * Run Drizzle Kit output through the matching Drizzle driver. Loading files and
 * acquiring the database are deferred until the Layer is built. Drizzle owns the
 * migration journal and transaction; failed migrations prevent auth startup.
 *
 * @internal
 */
export const drizzleMigrationsLayer = <Database, Options, E, R>(
  acquire: Effect.Effect<Database, never, R>,
  migrator: Effect.Effect<(database: Database, options: Options) => Effect.Effect<void, E>>
) =>
(options: Options) =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const database = yield* acquire
      const migrate = yield* migrator

      const migration = yield* Effect.try({
        try: () => migrate(database, options),
        catch: (cause) => PersistenceMappingError.make({ operation: "migration", cause })
      })

      yield* migration
    }).pipe(
      (effect) =>
        reportPersistenceFailure(effect, Schema.is(PersistenceConfigurationError), {
          markReported: true
        }),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, (error) =>
            Schema.is(PersistenceMappingError)(error)
              ? PersistenceConfigurationError.make({
                reason: "Could not read Drizzle migrations; check the migration source and format"
              })
              : error)
        )
      )
    )
  )

/**
 * SQL access to an entity actor's own SQLite from entity handlers.
 *
 * @stability experimental
 * @since 4.1.6
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

/**
 * Runs SQL on an entity actor's SQLite.
 *
 * **Details**
 *
 * `execute` runs one statement with positional `?` parameters and returns
 * its rows. A failed statement is a defect.
 *
 * @stability experimental
 * @category models
 * @since 4.1.6
 */
export interface SqlExecutor {
  readonly execute: <Row = Record<string, unknown>>(
    sql: string,
    ...params: ReadonlyArray<unknown>
  ) => Effect.Effect<Array<Row>>
}

/**
 * The SQL executor on the current entity actor's SQLite, for entity handler
 * builds and handlers.
 *
 * **Details**
 *
 * Inside a persisted request annotated with `ClusterSchema.WithTransaction`,
 * the service is that request's transaction, and the success reply commits
 * with the handler's writes. Read the service inside the handler, not in the
 * build: Rivet queues all other SQL on the actor behind an open transaction,
 * so a handler that runs SQL on the build-time executor from inside its
 * transaction waits on itself.
 *
 * Table names starting with `cluster_` are reserved for the mailbox. Read it
 * with {@link EntityDatabase.orDie} so an entity layer does not require it.
 *
 * @stability experimental
 * @category services
 * @since 4.1.6
 */
export class EntityDatabase extends Context.Service<EntityDatabase, SqlExecutor>()(
  "@effect/platform-rivet/RivetEntityDatabase/EntityDatabase"
) {
  /**
   * Gets the current entity actor's executor, or dies outside an entity actor.
   *
   * @stability experimental
   * @since 4.1.6
   */
  static readonly orDie: Effect.Effect<SqlExecutor> = Effect.flatMap(
    Effect.serviceOption(EntityDatabase),
    Option.match({
      onNone: () => Effect.die(new Error("EntityDatabase is only available inside an entity actor")),
      onSome: Effect.succeed
    })
  )
}

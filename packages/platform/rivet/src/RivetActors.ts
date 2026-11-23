/**
 * The RivetKit actor behind `RivetCluster.layer`.
 *
 * Every entity instance is one `clusterEntity` actor keyed
 * `[entityType, entityId]`, and the actor's own SQLite holds its mailbox.
 *
 * @stability experimental
 * @since 4.1.6
 */
import * as Effect from "effect/Effect"
import { actor } from "rivetkit"
import { db } from "rivetkit/db"
import { type EntityManager, makeEntityManagerForKey } from "./internal/entityRuntime.ts"
import { ddl, fromRawAccess } from "./internal/entityStorage.ts"

/**
 * Options for {@link makeClusterEntity}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.6
 */
export interface ClusterEntityOptions {
  /**
   * Runs at the start of `onWake`, before the mailbox drain. A rejection
   * fails the wake.
   */
  readonly onWake?: ((key: ReadonlyArray<string>) => Promise<void>) | undefined
  /**
   * Interval of the recurring schedule that wakes the actor while its mailbox
   * has unprocessed rows. Rivet's minimum is 5 seconds. Defaults to 5 seconds.
   */
  readonly drainIntervalMillis?: number | undefined
}

/**
 * The name of the recurring drain schedule each entity actor keeps while it
 * has unprocessed persisted requests.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.6
 */
export const drainScheduleName = "cluster_drain"

/**
 * Creates the `clusterEntity` actor definition. Register it under the
 * `clusterEntity` name with RivetKit's `setup`.
 *
 * **Details**
 *
 * `onMigrate` creates the mailbox tables. `onWake` resolves the entity
 * registration from the actor key and replays every unprocessed persisted
 * request before the actor serves actions, so build the application layer
 * (with `RivetCluster.layer` and the entity layers) before starting the
 * registry. Every handler run is held with `c.keepAwake`.
 *
 * @stability experimental
 * @category actors
 * @since 4.1.6
 */
export const makeClusterEntity = (options: ClusterEntityOptions = {}) => {
  const drainIntervalMillis = Math.max(5_000, options.drainIntervalMillis ?? 5_000)
  const managerOf = (vars: { manager: EntityManager | undefined }): EntityManager => {
    if (vars.manager === undefined) throw new Error("RivetCluster: the entity actor has not finished waking")
    return vars.manager
  }
  return actor({
    db: db({
      onMigrate: async (client) => {
        for (const statement of ddl) await client.execute(statement)
      }
    }),
    createVars: () => ({ manager: undefined as EntityManager | undefined }),
    onWake: async (c) => {
      if (options.onWake !== undefined) await options.onWake(c.key)
      const manager = makeEntityManagerForKey(c.key, {
        database: fromRawAccess(c.db),
        keepAwake: (effect) => {
          void c.keepAwake(Effect.runPromise(effect))
        },
        setDrainSchedule: (armed) =>
          Effect.promise(() =>
            armed
              ? c.cron.every({ name: drainScheduleName, interval: drainIntervalMillis, action: "drain", maxHistory: 0 })
              : c.cron.delete(drainScheduleName).then(() => undefined)
          )
      })
      c.vars.manager = manager
      await Effect.runPromise(manager.drain)
    },
    actions: {
      invoke: (c, envelope: string, discard: boolean, primaryKey: string | null) =>
        Effect.runPromise(managerOf(c.vars).invoke(envelope, discard, primaryKey)),
      interrupt: (c, requestId: string) => Effect.runPromise(managerOf(c.vars).interrupt(requestId)),
      drain: (c) => Effect.runPromise(managerOf(c.vars).drain)
    }
  })
}

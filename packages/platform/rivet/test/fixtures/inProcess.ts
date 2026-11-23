import { getEntityRegistration } from "@effect/platform-rivet/internal/entityRegistry"
import { type EntityManager, makeEntityManager } from "@effect/platform-rivet/internal/entityRuntime"
import { ddl, fromRawAccess } from "@effect/platform-rivet/internal/entityStorage"
import type { ClusterClient } from "@effect/platform-rivet/RivetCluster"
import { Effect } from "effect"
import { EntityAddress, EntityId, EntityType, ShardId } from "effect/cluster"
import { DatabaseSync } from "node:sqlite"
import { SqliteAccess } from "./sqlite.ts"

export interface Actor {
  readonly access: SqliteAccess
  readonly manager: EntityManager
}

// Runs each `clusterEntity` actor in process, on its own in-memory SQLite
// database, the way `RivetActors.makeClusterEntity` wires it on wake.
export const makeActors = () => {
  const actors = new Map<string, Promise<Actor>>()

  const wake = async (key: Array<string>): Promise<Actor> => {
    const [entityType, entityId] = key
    const registration = getEntityRegistration(entityType)
    if (registration === undefined) throw new Error(`no registration for ${entityType}`)
    const access = new SqliteAccess(new DatabaseSync(":memory:"))
    for (const statement of ddl) await access.db.execute(statement)
    const id = EntityId.make(entityId)
    const manager = makeEntityManager({
      database: fromRawAccess(access.db),
      address: EntityAddress.make({
        shardId: ShardId.make(registration.entity.getShardGroup(id), 1),
        entityType: EntityType.make(entityType),
        entityId: id
      }),
      keepAwake: (effect) => {
        Effect.runFork(effect)
      },
      setDrainSchedule: () => Effect.void
    })
    await Effect.runPromise(manager.drain)
    return { access, manager }
  }

  const actor = (key: Array<string>): Promise<Actor> => {
    const name = key.join("/")
    let found = actors.get(name)
    if (found === undefined) {
      found = wake(key)
      actors.set(name, found)
    }
    return found
  }

  const client: ClusterClient = {
    clusterEntity: {
      getOrCreate: (key) => ({
        action: async ({ args, name }) => {
          const { manager } = await actor(key)
          switch (name) {
            case "invoke":
              return Effect.runPromise(manager.invoke(args[0] as string, args[1] as boolean, args[2] as string | null))
            case "interrupt":
              return Effect.runPromise(manager.interrupt(args[0] as string))
            case "drain":
              return Effect.runPromise(manager.drain)
          }
          throw new Error(`unknown action: ${name}`)
        }
      })
    }
  }

  return { actor, client }
}

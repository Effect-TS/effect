import { Clock } from "../../../Clock.ts"
import * as Context from "../../../Context.ts"
import * as Effect from "../../../Effect.ts"
import * as Latch from "../../../Latch.ts"
import * as Layer from "../../../Layer.ts"
import type { EntityAddress } from "../EntityAddress.ts"
import type { EntityId } from "../EntityId.ts"
import type { EntityState } from "./entityManager.ts"
import type { ResourceMap } from "./resourceMap.ts"

const EntityReaperTypeId = "~effect/cluster/EntityReaper"
const EntityReaperMake = Effect.gen(function*() {
  let currentResolution = 30_000
  const registered: Array<{
    readonly maxIdleTime: number
    readonly servers: Map<EntityId, EntityState>
    readonly entities: ResourceMap<EntityAddress, EntityState, any>
  }> = []
  const latch = yield* Latch.make()

  const register = (options: {
    readonly maxIdleTime: number
    readonly servers: Map<EntityId, EntityState>
    readonly entities: ResourceMap<EntityAddress, EntityState, any>
  }) =>
    Effect.suspend(() => {
      currentResolution = Math.max(Math.min(currentResolution, options.maxIdleTime), 5000)
      registered.push(options)
      return latch.open
    })

  const clock = yield* Clock
  yield* Effect.gen(function*() {
    while (true) {
      yield* Effect.sleep(currentResolution)
      const now = clock.currentTimeMillisUnsafe()
      for (const { entities, maxIdleTime, servers } of registered) {
        for (const state of servers.values()) {
          const duration = now - state.lastActiveCheck
          if (state.keepAliveEnabled || state.activeRequests.size > 0 || duration < maxIdleTime) {
            continue
          }
          yield* Effect.forkChild(entities.removeIgnore(state.address))
        }
      }
    }
  }).pipe(
    latch.whenOpen,
    Effect.forkScoped
  )

  return {
    [EntityReaperTypeId]: EntityReaperTypeId as typeof EntityReaperTypeId,
    register
  } as const
})
type EntityReaperShape = Effect.Success<typeof EntityReaperMake>

/** @internal */
export interface EntityReaper extends EntityReaperShape {
  readonly [EntityReaperTypeId]: typeof EntityReaperTypeId
}

/**
 * Service key for `EntityReaper` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const EntityReaper = (() => {
  const service = Object.assign(Context.Service<EntityReaper>("effect/cluster/EntityReaper"), {
    make: EntityReaperMake
  })
  return Object.assign(service, { layer: Layer.effect(service)(service.make) })
})()

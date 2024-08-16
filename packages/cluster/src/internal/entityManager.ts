import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type { EntityAddress } from "../EntityAddress.js"

interface EntityState {
  readonly terminationFiber: Option.Option<Fiber.RuntimeFiber<void>>
}

/** @internal */
export const make = () =>
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    const states = yield* SynchronizedRef.make(
      HashMap.empty<EntityAddress, EntityState>()
    )

    function getOrCreateState(address: EntityAddress) {
      return SynchronizedRef.modifyEffect(states, (states) => {
        const state = HashMap.get(states, address)
        if (Option.isNone(state)) {
          // TODO: check if the sharding service is shutting down
        }
      })
    }

    return {}
  })

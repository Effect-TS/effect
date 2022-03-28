import type { UIO } from "../../Effect"
import type { Finalizer } from "../definition"
import type { ReleaseMap } from "./definition"
import { Exited, Running } from "./state"

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 *
 * @tsplus fluent ets/ReleaseMap updateAll
 */
export function updateAll_(
  self: ReleaseMap,
  f: (finalizer: Finalizer) => Finalizer,
  __tsplusTrace?: string
): UIO<void> {
  return self.ref.update((state) => {
    switch (state._tag) {
      case "Exited": {
        return new Exited(state.nextKey, state.exit, (_) => f(state.update(_)))
      }
      case "Running": {
        return new Running(state.nextKey, state.finalizers(), (_) => f(state.update(_)))
      }
    }
  })
}

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 */
export const updateAll = Pipeable(updateAll_)

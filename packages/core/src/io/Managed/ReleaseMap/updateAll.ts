import type { UIO } from "../../Effect"
import { update_ as refUpdate_ } from "../../Ref/operations/update"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
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
  return refUpdate_(self.ref, (state) => {
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
 *
 * @ets_data_first updateAll_
 */
export function updateAll(
  f: (finalizer: Finalizer) => Finalizer,
  __tsplusTrace?: string
) {
  return (self: ReleaseMap): UIO<void> => updateAll_(self, f)
}

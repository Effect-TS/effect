import type { UIO } from "../../Effect"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { noopFinalizer } from "./finalizer"
import { release_ } from "./release"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 *
 * @tsplus fluent ets/ReleaseMap add
 */
export function add_(
  self: ReleaseMap,
  finalizer: Finalizer,
  __tsplusTrace?: string
): UIO<Finalizer> {
  return self.addIfOpen(finalizer).map((_) =>
    _.fold(
      (): Finalizer => noopFinalizer,
      (k): Finalizer =>
        (e) =>
          release_(self, k, e)
    )
  )
}

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 *
 * @ets_data_first add_
 */
export function add(finalizer: Finalizer, __tsplusTrace?: string) {
  return (self: ReleaseMap) => add_(self, finalizer)
}

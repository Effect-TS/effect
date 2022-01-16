// ets_tracing: off

import * as O from "../../Option"
import * as T from "../operations/_internal/effect"
import { addIfOpen_ } from "./addIfOpen"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { release_ } from "./release"

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 */
export function add_(
  self: ReleaseMap,
  finalizer: Finalizer,
  __trace?: string
): T.UIO<Finalizer> {
  return T.map_(
    addIfOpen_(self, finalizer),
    O.fold(
      (): Finalizer => () => T.unit,
      (k): Finalizer =>
        (e) =>
          release_(self, k, e)
    ),
    __trace
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
export function add(finalizer: Finalizer, __trace?: string) {
  return (self: ReleaseMap) => add_(self, finalizer, __trace)
}

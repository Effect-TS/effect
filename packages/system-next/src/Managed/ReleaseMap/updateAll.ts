// ets_tracing: off

import { pipe } from "../../Function"
import type * as T from "../operations/_internal/effect"
import * as Ref from "../operations/_internal/ref"
import type { ReleaseMap } from "./definition"
import type { Finalizer } from "./finalizer"
import { Exited, Running } from "./state"

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 */
export function updateAll_(
  self: ReleaseMap,
  f: (finalizer: Finalizer) => Finalizer,
  __trace?: string
): T.UIO<void> {
  return pipe(
    self.ref,
    Ref.update((state) => {
      switch (state._tag) {
        case "Exited": {
          return new Exited(state.nextKey, state.exit, (_) => f(state.update(_)))
        }
        case "Running": {
          return new Running(state.nextKey, state.finalizers(), (_) =>
            f(state.update(_))
          )
        }
      }
    }, __trace)
  )
}

/**
 * Updates the finalizers associated with this scope using the specified
 * function.
 *
 * @ets_data_first updateAll_
 */
export function updateAll(f: (finalizer: Finalizer) => Finalizer, __trace?: string) {
  return (self: ReleaseMap): T.UIO<void> => updateAll_(self, f, __trace)
}

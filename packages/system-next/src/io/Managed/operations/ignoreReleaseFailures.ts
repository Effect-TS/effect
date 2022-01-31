import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"

/**
 * Returns a new managed effect that ignores defects in finalizers.
 *
 * @ets fluent ets/Managed ignoreReleaseFailures
 */
export function ignoreReleaseFailures<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return Managed(
    fiberRefGet(currentReleaseMap.value)
      .tap((releaseMap) =>
        releaseMap.updateAll(
          (finalizer) => (exit) => finalizer(exit).catchAllCause(() => Effect.unit)
        )
      )
      .zipRight(self.effect)
  )
}

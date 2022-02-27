import { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"

/**
 * Returns a new managed effect that ignores defects in finalizers.
 *
 * @tsplus fluent ets/Managed ignoreReleaseFailures
 */
export function ignoreReleaseFailures<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return Managed(
    FiberRef.currentReleaseMap.value
      .get()
      .tap((releaseMap) =>
        releaseMap.updateAll(
          (finalizer) => (exit) => finalizer(exit).catchAllCause(() => Effect.unit)
        )
      )
      .zipRight(self.effect)
  )
}

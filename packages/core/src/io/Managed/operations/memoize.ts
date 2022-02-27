import { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import { Promise } from "../../Promise"
import { Managed } from "../definition"

/**
 * Returns a memoized version of the specified managed.
 *
 * @tsplus fluent ets/Managed memoize
 */
export function memoize<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<unknown, never, Managed<R, E, A>> {
  return Managed.releaseMap.mapEffect((finalizers) =>
    Effect.Do()
      .bind("promise", () => Promise.make<E, A>())
      .bind("complete", ({ promise }) =>
        self.effect
          .apply(FiberRef.currentReleaseMap.value.locally(finalizers))
          .map((_) => _.get(1))
          .intoPromise(promise)
          .once()
      )
      .map(({ complete, promise }) =>
        Managed.fromEffect(complete.flatMap(() => promise.await()))
      )
  )
}

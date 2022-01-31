import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import { await as promiseAwait } from "../../Promise/operations/await"
import { make as promiseMake } from "../../Promise/operations/make"
import { Managed } from "../definition"

/**
 * Returns a memoized version of the specified managed.
 *
 * @ets fluent ets/Managed memoize
 */
export function memoize<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<unknown, never, Managed<R, E, A>> {
  return Managed.releaseMap.mapEffect((finalizers) =>
    Effect.Do()
      .bind("promise", () => promiseMake<E, A>())
      .bind("complete", ({ promise }) =>
        locally_(
          currentReleaseMap.value,
          finalizers
        )(self.effect)
          .map((_) => _.get(1))
          .intoPromise(promise)
          .once()
      )
      .map(({ complete, promise }) =>
        Managed.fromEffect(complete.flatMap(() => promiseAwait(promise)))
      )
  )
}

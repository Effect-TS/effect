import { Promise } from "../../Promise"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @tsplus fluent ets/Effect memoize
 */
export function memoize<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): UIO<Effect<R, E, A>> {
  return Effect.Do()
    .bind("promise", () => Promise.make<E, A>())
    .bind("complete", ({ promise }) => self.intoPromise(promise).once())
    .map(({ complete, promise }) => complete > promise.await())
}

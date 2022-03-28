import type { Effect, RIO } from "../../../io/Effect"
import { Take } from "../definition"

/**
 * Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds
 * with the `Take<E, A>`. Any error returned from the stream when pulling is
 * converted to `Take.halt`. Creates a singleton chunk.
 *
 * @tsplus static ets/TakeOps fromEffect
 */
export function fromEffect<R, E, A>(effect: Effect<R, E, A>): RIO<R, Take<E, A>> {
  return effect.foldCause((cause) => Take.failCause(cause), Take.single)
}

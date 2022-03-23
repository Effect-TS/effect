import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream from an effect producing a value of type `A`
 *
 * @tsplus static ets/StreamOps fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.fromEffectOption(effect().mapError(Option.some))
}

import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream from an effect producing a value of type `Iterable<A>`
 *
 * @tsplus static ets/StreamOps fromIterableEffect
 */
export function fromIterableEffect<R, E, A>(
  iterable: LazyArg<Effect<R, E, Iterable<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.fromEffect(iterable).mapConcat(identity)
}

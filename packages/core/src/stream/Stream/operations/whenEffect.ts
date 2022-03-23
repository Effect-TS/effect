import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns the specified stream if the specified effectful condition is
 * satisfied, otherwise returns an empty stream.
 *
 * @tsplus static ets/StreamOps whenEffect
 */
export function whenEffect<R, E, R1, E1, A>(
  b: LazyArg<Effect<R, E, boolean>>,
  stream: LazyArg<Stream<R1, E1, A>>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return Stream.fromEffect(b()).flatMap((b) => (b ? stream() : Stream.empty))
}

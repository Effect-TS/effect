import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns the specified stream if the given condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @tsplus static ets/StreamOps when
 */
export function when<R, E, A>(
  b: LazyArg<boolean>,
  stream: LazyArg<Stream<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.whenEffect(Effect.succeed(b), stream)
}

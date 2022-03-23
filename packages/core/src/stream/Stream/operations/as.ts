import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../../Stream"

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @tsplus fluent ets/Stream as
 */
export function as_<R, E, A, A2>(
  self: Stream<R, E, A>,
  a: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, E, A2> {
  return self.map(a)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export const as = Pipeable(as_)

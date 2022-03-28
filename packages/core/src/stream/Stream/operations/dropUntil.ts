import type { Predicate } from "../../../data/Function"
import { Stream } from "../../Stream"

/**
 * Creates a pipeline that drops elements until the specified predicate
 * evaluates to true.
 *
 * @tsplus fluent ets/Stream dropUntil
 */
export function dropUntil_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.dropWhile((a) => !f(a)).via(Stream.drop(1))
}

/**
 * Creates a pipeline that drops elements until the specified predicate
 * evaluates to true.
 *
 * @tsplus static ets/StreamOps dropUntil
 */
export const dropUntil = Pipeable(dropUntil_)

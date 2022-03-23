import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * @tsplus fluent ets/Stream scanReduce
 */
export function scanReduce_<R, E, A, A2 extends A>(
  self: Stream<R, E, A>,
  f: (a2: A2, a: A) => A2,
  __tsplusTrace?: string
): Stream<R, E, A2> {
  return self.scanReduceEffect((curr, next) => Effect.succeedNow(f(curr, next)))
}

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results.
 */
export const scanReduce = Pipeable(scanReduce_)

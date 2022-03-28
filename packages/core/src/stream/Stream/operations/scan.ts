import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @tsplus fluent ets/Stream scan
 */
export function scan_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Stream<R, E, S> {
  return self.scanEffect(s, (s, a) => Effect.succeedNow(f(s, a)))
}

/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @tsplus static ets/StreamOps scan
 */
export const scan = Pipeable(scan_)

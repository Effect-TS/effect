import type { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus fluent ets/Effect timedWith
 */
export function timedWith_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  milliseconds: LazyArg<Effect<R1, E1, number>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Tuple<[Duration, A]>> {
  return self.summarized(milliseconds, (start, end) => Duration(end - start))
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export const timedWith = Pipeable(timedWith_)

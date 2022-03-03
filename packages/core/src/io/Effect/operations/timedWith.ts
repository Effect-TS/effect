import type { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import type { Effect } from "../definition"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus fluent ets/Effect timedWith
 */
export function timedWith_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  msTime: Effect<R1, E1, number>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Tuple<[Duration, A]>> {
  return self.summarized(msTime, (start, end) => Duration(end - start))
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @ets_data_first timedWith_
 */
export function timedWith<R1, E1>(
  msTime: Effect<R1, E1, number>,
  __tsplusTrace?: string
) {
  return <R, E, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1, E | E1, Tuple<[Duration, A]>> => self.timedWith(msTime)
}

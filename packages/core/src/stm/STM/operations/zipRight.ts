import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @tsplus operator ets/STM >
 * @tsplus fluent ets/STM zipRight
 */
export function zipRight_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, A1> {
  return self.zipWith(that, (_, b) => b)
}

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R1, E | E1, A1> => self.zipRight(that)
}

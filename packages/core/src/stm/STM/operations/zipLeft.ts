import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @tsplus operator ets/STM <
 * @tsplus fluent ets/STM zipLeft
 */
export function zipLeft_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, A> {
  return self.zipWith(that, (a, _) => a)
}

/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R1, E | E1, A> => self.zipLeft(that)
}

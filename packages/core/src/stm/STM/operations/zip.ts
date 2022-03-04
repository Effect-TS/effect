import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Sequentially zips this value with the specified one.
 *
 * @tsplus fluent ets/STM zip
 */
export function zip_<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, Tuple<[A, A1]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Sequentially zips this value with the specified one.
 *
 * @ets_data_first zip_
 */
export function zip<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R1, E | E1, Tuple<[A, A1]>> =>
    self.zip(that)
}

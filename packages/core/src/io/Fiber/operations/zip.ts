import { Tuple } from "../../../collection/immutable/Tuple"
import type { Fiber } from "../definition"

/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 *
 * @tsplus fluent ets/Fiber zip
 * @tsplus fluent ets/RuntimeFiber zip
 */
export function zip_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, Tuple<[A, A1]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 *
 * @ets_data_first zip_
 */
export function zip<E1, A1>(that: Fiber<E1, A1>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, Tuple<[A, A1]>> => self.zip(that)
}

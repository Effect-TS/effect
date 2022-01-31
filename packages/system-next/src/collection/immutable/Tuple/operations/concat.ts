import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Concatenates two tuples.
 *
 * @tsplus operator ets/Tuple +
 * @tsplus fluent ets/Tuple concat
 */
export function concat_<Ks extends unknown[], Hs extends unknown[]>(
  self: Tuple<Ks>,
  that: Tuple<Hs>
): Tuple<[...Ks, ...Hs]> {
  return new TupleInternal([...self.tuple, ...that.tuple])
}

/**
 * Concatenates two tuples.
 *
 * @ets_data_first concat_
 */
export function concat<Hs extends unknown[]>(that: Tuple<Hs>) {
  return <Ks extends unknown[]>(self: Tuple<Ks>): Tuple<[...Ks, ...Hs]> => self + that
}

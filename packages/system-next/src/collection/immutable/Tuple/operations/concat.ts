import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Concatenates two tuples.
 *
 * @ets operator ets/Tuple +
 * @ets fluent ets/Tuple concat
 */
export function concat_<Ks extends unknown[], Hs extends unknown[]>(
  self: Tuple<Ks>,
  that: Tuple<Hs>
): Tuple<[...Ks, ...Hs]> {
  return new TupleInternal([...self.value, ...that.value])
}

/**
 * Concatenates two tuples.
 *
 * @ets_data_first concat_
 */
export function concat<Hs extends unknown[]>(that: Tuple<Hs>) {
  return <Ks extends unknown[]>(self: Tuple<Ks>): Tuple<[...Ks, ...Hs]> => self + that
}

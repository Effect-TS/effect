import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"

/**
 * Combines this computation with the specified computation combining the
 * results of both into a tuple.
 *
 * @tsplus fluent ets/IO zip
 */
export function zip_<A, B>(self: IO<A>, that: LazyArg<IO<B>>): IO<Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Combines this computation with the specified computation, combining the
 * results of both into a tuple.
 *
 * @ets_data_first zip_
 */
export function zip<B>(that: LazyArg<IO<B>>) {
  return <A>(self: IO<A>): IO<Tuple<[A, B]>> => self.zip(that)
}

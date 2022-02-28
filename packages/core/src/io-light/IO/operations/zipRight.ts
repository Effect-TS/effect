import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"

/**
 * Combines this computation with the specified computation, returning the
 * value of that computation.
 *
 * @tsplus operator ets/IO >
 * @tsplus fluent ets/IO zipRight
 */
export function zipRight_<A, B>(self: IO<A>, that: LazyArg<IO<B>>): IO<B> {
  return self.zipWith(that, (_, b) => b)
}

/**
 * Combines this computation with the specified computation, returning the
 * value of that computation.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<B>(that: LazyArg<IO<B>>) {
  return <A>(self: IO<A>): IO<B> => self.zipRight(that)
}

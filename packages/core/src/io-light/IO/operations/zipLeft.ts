import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"

/**
 * Combines this computation with the specified computation, returning the
 * value of this computation.
 *
 * @tsplus operator ets/IO <
 * @tsplus fluent ets/IO zipLeft
 */
export function zipLeft_<A, B>(self: IO<A>, that: LazyArg<IO<B>>): IO<A> {
  return self.zipWith(that, (a, _) => a)
}

/**
 * Combines this computation with the specified computation, returning the
 * value of this computation.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<B>(that: LazyArg<IO<B>>) {
  return <A>(self: IO<A>): IO<A> => self.zipLeft(that)
}

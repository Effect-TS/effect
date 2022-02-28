import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"

/**
 * Combines this computation with the specified computation combining the
 * results of both using the specified function.
 *
 * @tsplus fluent ets/IO zipWith
 */
export function zipWith_<A, B, C>(
  self: IO<A>,
  that: LazyArg<IO<B>>,
  f: (a: A, b: B) => C
) {
  return self.flatMap((a) => that().map((b) => f(a, b)))
}

/**
 * Combines this computation with the specified computation combining the
 * results of both using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(that: LazyArg<IO<B>>, f: (a: A, b: B) => C) {
  return (self: IO<A>): IO<C> => self.zipWith(that, f)
}

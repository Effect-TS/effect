/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @tsplus fluent ets/STM zipWith
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, B>>,
  f: (a: A, b: B) => C
): STM<R1 & R, E | E1, C> {
  return self.flatMap((a) => that().map((b) => f(a, b)))
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @tsplus static ets/STM/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_)

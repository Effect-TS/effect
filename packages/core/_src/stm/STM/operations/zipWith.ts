/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @tsplus static effect/core/stm/STM.Aspects zipWith
 * @tsplus pipeable effect/core/stm/STM zipWith
 */
export function zipWith<R1, E1, A1, A, A2>(
  that: LazyArg<STM<R1, E1, A1>>,
  f: (a: A, b: A1) => A2
) {
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> =>
    self.flatMap(
      (a) => that().map((b) => f(a, b))
    )
}

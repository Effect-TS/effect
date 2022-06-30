/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus static effect/core/io/Exit.Aspects zip
 * @tsplus pipeable effect/core/io/Exit zip
 */
export function zip<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, Tuple<[A, A2]>> =>
    self.zipWith(
      that,
      (a, b) => Tuple(a, b),
      Cause.then
    )
}

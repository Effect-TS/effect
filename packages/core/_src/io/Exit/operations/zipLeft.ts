/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus operator effect/core/io/Exit <
 * @tsplus static effect/core/io/Exit.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Exit zipLeft
 */
export function zipLeft<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, A> =>
    self.zipWith(
      that,
      (a, _) => a,
      Cause.then
    )
}

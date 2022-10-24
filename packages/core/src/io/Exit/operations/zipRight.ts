/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus pipeable-operator effect/core/io/Exit >
 * @tsplus static effect/core/io/Exit.Aspects zipRight
 * @tsplus pipeable effect/core/io/Exit zipRight
 * @category zipping
 * @since 1.0.0
 */
export function zipRight<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, A2> =>
    self.zipWith(
      that,
      (_, b) => b,
      Cause.then
    )
}

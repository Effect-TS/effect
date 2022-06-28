/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus static effect/core/io/Exit.Aspects zipParRight
 * @tsplus pipeable effect/core/io/Exit zipParRight
 */
export function zipParRight<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, A2> =>
    self.zipWith(
      that,
      (_, b) => b,
      Cause.both
    )
}

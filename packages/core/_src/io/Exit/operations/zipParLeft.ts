/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus static effect/core/io/Exit.Aspects zipParLeft
 * @tsplus pipeable effect/core/io/Exit zipParLeft
 */
export function zipParLeft<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, A> =>
    self.zipWith(
      that,
      (a, _) => a,
      Cause.both
    )
}

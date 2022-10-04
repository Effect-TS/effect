/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @tsplus static effect/core/io/Exit.Aspects zipPar
 * @tsplus pipeable effect/core/io/Exit zipPar
 */
export function zipPar<E2, A2>(that: Exit<E2, A2>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E2, readonly [A, A2]> =>
    self.zipWith(
      that,
      (a, b) => [a, b] as const,
      Cause.both
    )
}

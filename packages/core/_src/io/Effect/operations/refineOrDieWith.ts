/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/io/Effect.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/io/Effect refineOrDieWith
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Maybe<E1>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1, A> =>
    self.catchAll((e) =>
      pf(e).fold(
        () => Effect.dieNow(f(e)),
        (e1) => Effect.fail(e1)
      )
    )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @tsplus static effect/core/io/Effect.Aspects fold
 * @tsplus pipeable effect/core/io/Effect fold
 */
export function fold<E, A, A2, A3>(
  failure: (e: E) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R, never, A2 | A3> =>
    self.foldEffect(
      (e) => Effect.succeed(failure(e)),
      (a) => Effect.succeed(success(a))
    )
}

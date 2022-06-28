/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @tsplus static effect/core/io/Effect.Aspects foldCause
 * @tsplus pipeable effect/core/io/Effect foldCause
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R, never, A2 | A3> =>
    self.foldCauseEffect(
      (c) => Effect.succeedNow(failure(c)),
      (a) => Effect.succeedNow(success(a))
    )
}

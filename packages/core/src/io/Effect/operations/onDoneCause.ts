/**
 * @tsplus static effect/core/io/Effect.Aspects onDoneCause
 * @tsplus pipeable effect/core/io/Effect onDoneCause
 */
export function onDoneCause<E, A, R1, X1, R2, X2>(
  error: (e: Cause<E>) => Effect<R1, never, X1>,
  success: (a: A) => Effect<R2, never, X2>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R1 | R2, never, void> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self)
        .foldCauseEffect(
          (e) => restore(error(e)),
          (s) => restore(success(s))
        )
        .forkDaemon
        .unit
    )
}

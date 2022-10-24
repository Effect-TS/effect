/**
 * @tsplus static effect/core/io/Effect.Aspects onDone
 * @tsplus pipeable effect/core/io/Effect onDone
 * @category mutations
 * @since 1.0.0
 */
export function onDone<E, A, R1, X1, R2, X2>(
  error: (e: E) => Effect<R1, never, X1>,
  success: (a: A) => Effect<R2, never, X2>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R1 | R2, never, void> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self)
        .foldEffect(
          (e) => restore(error(e)),
          (s) => restore(success(s))
        )
        .forkDaemon
        .unit
    )
}

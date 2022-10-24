/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects onExit
 * @tsplus pipeable effect/core/io/Effect onExit
 * @category mutations
 * @since 1.0.0
 */
export function onExit<E, A, R2, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R2, never, X>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    Effect.acquireUseReleaseExit(
      Effect.unit,
      () => self,
      (_, exit) => cleanup(exit)
    )
}

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `acquireReleaseWith`.
 *
 * @tsplus static effect/core/io/Effect.Aspects ensuring
 * @tsplus pipeable effect/core/io/Effect ensuring
 */
export function ensuring<R1, X>(finalizer: Effect<R1, never, X>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    Effect.uninterruptibleMask((mask) =>
      mask.restore(self).foldCauseEffect(
        (cause1) =>
          finalizer.foldCauseEffect(
            (cause2) => Effect.failCause(Cause.then(cause1, cause2)),
            () => Effect.failCause(cause1)
          ),
        a => finalizer.map(() => a)
      )
    )
}

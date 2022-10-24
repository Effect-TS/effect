/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @tsplus static effect/core/io/Effect.Aspects onTermination
 * @tsplus pipeable effect/core/io/Effect onTermination
 * @category mutations
 * @since 1.0.0
 */
export function onTermination<R2, X>(cleanup: (cause: Cause<never>) => Effect<R2, never, X>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    Effect.acquireUseReleaseExit(
      Effect.unit,
      () => self,
      (_, exit) => {
        if (exit._tag === "Failure") {
          const either = exit.cause.failureOrCause
          switch (either._tag) {
            case "Left": {
              return Effect.unit
            }
            case "Right": {
              return cleanup(either.right)
            }
          }
        }
        return Effect.unit
      }
    )
}

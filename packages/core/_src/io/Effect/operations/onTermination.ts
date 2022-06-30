/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @tsplus static effect/core/io/Effect.Aspects onTermination
 * @tsplus pipeable effect/core/io/Effect onTermination
 */
export function onTermination<R2, X>(
  cleanup: (cause: Cause<never>) => Effect<R2, never, X>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    Effect.acquireUseReleaseExit(
      Effect.unit,
      () => self,
      (_, exit) =>
        exit._tag === "Failure"
          ? exit.cause.failureOrCause.fold(() => Effect.unit, cleanup)
          : Effect.unit
    )
}

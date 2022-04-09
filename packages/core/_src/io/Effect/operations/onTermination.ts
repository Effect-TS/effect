/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @tsplus fluent ets/Effect onTermination
 */
export function onTermination_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<never>) => RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E, A> {
  return Effect.acquireReleaseExitUse(
    Effect.unit,
    () => self,
    (_, exit) =>
      exit._tag === "Failure"
        ? exit.cause.failureOrCause().fold(() => Effect.unit, cleanup)
        : Effect.unit
  );
}

/**
 * Runs the specified effect if this effect is terminated, either because of a
 * defect or because of interruption.
 *
 * @tsplus static ets/Effect/Aspects onTermination
 */
export const onTermination = Pipeable(onTermination_);

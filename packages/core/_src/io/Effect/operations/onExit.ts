/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @tsplus fluent ets/Effect onExit
 */
export function onExit_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect.RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E, A> {
  return Effect.acquireUseReleaseExit(
    Effect.unit,
    () => self,
    (_, exit) => cleanup(exit)
  );
}

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @tsplus static ets/Effect/Aspects onExit
 */
export const onExit = Pipeable(onExit_);

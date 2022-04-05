/**
 * Recovers from all non-fatal defects.
 *
 * @tsplus fluent ets/Effect catchNonFatalOrDie
 */
export function catchNonFatalOrDie_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldEffect(
    (e) => Effect.runtime().flatMap((runtime) => runtime.runtimeConfig.value.fatal(e) ? Effect.dieNow(e) : f(e)),
    Effect.succeedNow
  );
}

/**
 * Recovers from all non-fatal defects.
 *
 * @tsplus static ets/Effect/Aspects catchNonFatalOrDie
 */
export const catchNonFatalOrDie = Pipeable(catchNonFatalOrDie_);

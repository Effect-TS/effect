/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Effect catchAll
 */
export function catchAll_<R2, E2, A2, R, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R2 & R, E2, A2 | A> {
  return self.foldEffect(f, Effect.succeedNow);
}

/**
 * Recovers from all errors.
 *
 * @tsplus static ets/Effect/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_);

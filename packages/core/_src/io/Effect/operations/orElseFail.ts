/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @tsplus fluent ets/Effect orElseFail
 */
export function orElseFail_<R, E, A, E2>(
  self: Effect<R, E, A>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
): Effect<R, E2, A> {
  return self.orElse(Effect.fail(e));
}

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @tsplus static ets/Effect/Aspects orElseFail
 */
export const orElseFail = Pipeable(orElseFail_);

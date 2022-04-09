/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @tsplus fluent ets/STM orElseFail
 */
export function orElseFail_<R, E, E1, A>(
  self: STM<R, E, A>,
  e: LazyArg<E1>
): STM<R, E | E1, A> {
  return self | STM.fail(e);
}

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @tsplus static ets/STM/Aspects orElseFail
 */
export const orElseFail = Pipeable(orElseFail_);

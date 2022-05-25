/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @tsplus fluent ets/STM orElseSucceed
 */
export function orElseSucceed_<R, E, A, A1>(
  self: STM<R, E, A>,
  a: LazyArg<A1>
): STM<R, E, A | A1> {
  return self | STM.succeed(a)
}

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @tsplus static ets/STM/Aspects orElseSucceed
 */
export const orElseSucceed = Pipeable(orElseSucceed_)

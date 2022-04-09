/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @tsplus fluent ets/Effect orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Effect<R, E, A>,
  a: LazyArg<A2>,
  __tsplusTrace?: string
): Effect<R, E, A | A2> {
  return self | Effect.succeed(a);
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @tsplus static ets/Effect/Aspects orElseSucceed
 */
export const orElseSucceed = Pipeable(orElseSucceed_);

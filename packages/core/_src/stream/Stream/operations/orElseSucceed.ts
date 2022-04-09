/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @tsplus fluent ets/Stream orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Stream<R, E, A>,
  a: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, never, A | A2> {
  return self | Stream.succeed(a);
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @tsplus static ets/Stream/Aspects orElseSucceed
 */
export const orElseSucceed = Pipeable(orElseSucceed_);

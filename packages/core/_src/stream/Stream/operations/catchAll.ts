/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @tsplus fluent ets/Stream catchAll
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (e: E) => Stream<R2, E2, A2>,
  __tsplusTrace?: string
): Stream<R & R2, E2, A | A2> {
  return self.catchAllCause((cause) => cause.failureOrCause().fold(f, (cause) => Stream.failCause(cause)));
}

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @tsplus static ets/Stream/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_);

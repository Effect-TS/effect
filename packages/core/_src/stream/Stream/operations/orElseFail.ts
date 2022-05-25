/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus fluent ets/Stream orElseFail
 */
export function orElseFail_<R, E, E2, A>(
  self: Stream<R, E, A>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  return self | Stream.fail(e)
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static ets/Stream/Aspects orElseFail
 */
export const orElseFail = Pipeable(orElseFail_)

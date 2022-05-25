/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus fluent ets/Stream timeoutFail
 */
export function timeoutFail_<R, E, E2, A>(
  self: Stream<R, E, A>,
  e: LazyArg<E2>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self.timeoutTo(duration, Stream.fail(e))
}

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus static ets/Stream/Aspects timeoutFail
 */
export const timeoutFail = Pipeable(timeoutFail_)

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus fluent ets/Stream timeoutFailCause
 */
export function timeoutFailCause_<R, E, E2, A>(
  self: Stream<R, E, A>,
  cause: LazyArg<Cause<E2>>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return Stream.succeed(Tuple(cause(), duration())).flatMap(
    ({ tuple: [cause, duration] }) =>
      Stream.fromPull(
        self
          .toPull()
          .map((pull) => pull.timeoutFailCause(cause.map(Option.some), duration))
      )
  )
}

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus static ets/Stream/Aspects timeoutFailCause
 */
export const timeoutFailCause = Pipeable(timeoutFailCause_)

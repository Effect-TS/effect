/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @tsplus fluent ets/Stream timeout
 */
export function timeout_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.succeed(duration).flatMap((duration) =>
    Stream.fromPull(
      self.toPull().map((pull) => pull.timeoutFail(Option.none, duration))
    )
  )
}

/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @tsplus static ets/Stream/Aspects timeout
 */
export const timeout = Pipeable(timeout_)

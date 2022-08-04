/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects timeoutFailCause
 * @tsplus pipeable effect/core/stream/Stream timeoutFailCause
 */
export function timeoutFailCause<E2>(
  cause: LazyArg<Cause<E2>>,
  duration: LazyArg<Duration>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E | E2, A> =>
    Stream.succeed(Tuple(cause(), duration())).flatMap(
      ({ tuple: [cause, duration] }) =>
        Stream.fromPull<R, E | E2, A>(
          self.toPull.map((pull) => pull.timeoutFailCause(cause.map(Maybe.some), duration))
        )
    )
}

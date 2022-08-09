/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects timeoutFailCause
 * @tsplus pipeable effect/core/io/Effect timeoutFailCause
 */
export function timeoutFailCause<E1>(cause: Cause<E1>, duration: Duration) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E | E1, A> =>
    self.timeoutTo(Effect.failCauseSync(cause), Effect.succeed, duration).flatten
}

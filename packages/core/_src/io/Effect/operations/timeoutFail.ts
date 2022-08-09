/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @tsplus static effect/core/io/Effect.Aspects timeoutFail
 * @tsplus pipeable effect/core/io/Effect timeoutFail
 */
export function timeoutFail<E1>(e: E1, duration: Duration) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E | E1, A> =>
    self.timeoutTo(Effect.failSync(e), Effect.succeed, duration).flatten
}

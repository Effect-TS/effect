/**
 * Returns a stream that effectfully "peeks" at the cause of failure of the
 * stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects tapErrorCause
 * @tsplus pipeable effect/core/stream/Stream tapErrorCause
 */
export function tapErrorCause<E, R2, E2, A2>(
  f: (cause: Cause<E>) => Effect<R2, E2, A2>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.catchAllCause((e) => Stream.fromEffect(f(e).zipRight(Effect.failCauseSync(e))))
}

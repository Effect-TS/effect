/**
 * Returns a stream that effectfully "peeks" at the failure of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects tapError
 * @tsplus pipeable effect/core/stream/Stream tapError
 */
export function tapError<E, R2, E2, Z>(
  f: (e: E) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.catchAll((e) => Stream.fromEffect(f(e)) > Stream.fail(e))
}

/**
 * Runs the specified effect if this stream fails, providing the error to the
 * effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided
 * effect will not be interrupted.
 *
 * @tsplus static effect/core/stream/Stream.Aspects onError
 * @tsplus pipeable effect/core/stream/Stream onError
 */
export function onError<E, R2, Z>(
  cleanup: (cause: Cause<E>) => Effect<R2, never, Z>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    self.catchAllCause((cause) => Stream.fromEffect(cleanup(cause) > Effect.failCauseSync(cause)))
}

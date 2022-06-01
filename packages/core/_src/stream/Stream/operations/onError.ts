/**
 * Runs the specified effect if this stream fails, providing the error to the
 * effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided
 * effect will not be interrupted.
 *
 * @tsplus fluent ets/Stream onError
 */
export function onError_<R, E, A, R2, Z>(
  self: Stream<R, E, A>,
  cleanup: (cause: Cause<E>) => Effect.RIO<R2, Z>,
  __tsplusTrace?: string
): Stream<R | R2, E, A> {
  return self.catchAllCause((cause) => Stream.fromEffect(cleanup(cause) > Effect.failCause(cause)))
}

/**
 * Runs the specified effect if this stream fails, providing the error to the
 * effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided
 * effect will not be interrupted.
 *
 * @tsplus static ets/Stream/Aspects onError
 */
export const onError = Pipeable(onError_)

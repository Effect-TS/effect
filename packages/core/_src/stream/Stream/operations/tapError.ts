/**
 * Returns a stream that effectfully "peeks" at the failure of the stream.
 *
 * @tsplus fluent ets/Stream tapError
 */
export function tapError_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (e: E) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A> {
  return self.catchAll((e) => Stream.fromEffect(f(e)) > Stream.fail(e))
}

/**
 * Returns a stream that effectfully "peeks" at the failure of the stream.
 *
 * @tsplus static ets/Stream/Aspects tapError
 */
export const tapError = Pipeable(tapError_)

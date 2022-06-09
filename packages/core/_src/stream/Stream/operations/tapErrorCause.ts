/**
 * Returns a stream that effectfully "peeks" at the cause of failure of the
 * stream.
 *
 * @tsplus fluent ets/Stream tapErrorCause
 */
export function tapErrorCause_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (cause: Cause<E>) => Effect<R2, E2, A2>
): Stream<R | R2, E | E2, A> {
  return self.catchAllCause((e) => Stream.fromEffect(f(e).zipRight(Effect.failCause(e))))
}

/**
 * Returns a stream that effectfully "peeks" at the cause of failure of the
 * stream.
 *
 * @tsplus static ets/Stream/Aspects tapErrorCause
 */
export const tapErrorCause = Pipeable(tapErrorCause_)

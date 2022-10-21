/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @tsplus static effect/core/stream/Stream.Ops acquireRelease
 * @tsplus fluent effect/core/stream/Stream acquireRelease
 */
export function acquireRelease<R, E, A, R2, Z>(
  acquire: Effect<R, E, A>,
  release: (a: A) => Effect<R2, never, Z>
): Stream<R | R2, E, A> {
  return Stream.scoped(Effect.acquireRelease(acquire, release))
}

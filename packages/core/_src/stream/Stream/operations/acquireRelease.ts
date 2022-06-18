/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed.
 *
 * @tsplus static ets/Stream/Ops acquireRelease
 * @tsplus fluent ets/Stream acquireRelease
 */
export function acquireRelease<R, E, A, R2, Z>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A) => Effect<R2, never, Z>,
  __tsplusTrace?: string
): Stream<R | R2, E, A> {
  return Stream.scoped(Effect.acquireRelease(acquire, release))
}

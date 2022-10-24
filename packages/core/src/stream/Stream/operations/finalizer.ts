/**
 * Creates a one-element stream that never fails and executes the finalizer
 * when it ends.
 *
 * @tsplus static effect/core/stream/Stream.Ops finalizer
 * @category finalizers
 * @since 1.0.0
 */
export function finalizer<R, Z>(finalizer: Effect<R, never, Z>): Stream<R, never, void> {
  return Stream.acquireRelease(Effect.unit, () => finalizer)
}

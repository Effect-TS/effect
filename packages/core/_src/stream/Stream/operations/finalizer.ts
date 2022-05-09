/**
 * Creates a one-element stream that never fails and executes the finalizer
 * when it ends.
 *
 * @tsplus static ets/Stream/Ops finalizer
 */
export function finalizer<R, Z>(
  finalizer: LazyArg<Effect.RIO<R, Z>>,
  __tsplusTrace?: string
): Stream<R, never, void> {
  return Stream.acquireRelease(Effect.unit, finalizer);
}

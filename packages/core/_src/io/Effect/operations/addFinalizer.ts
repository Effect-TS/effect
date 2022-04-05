/**
 * Adds a finalizer to the scope of this workflow. The finalizer is guaranteed
 * to be run when the scope is closed.
 *
 * @tsplus static ets/Effect/Ops addFinalizer
 */
export function addFinalizer<R, X>(
  finalizer: LazyArg<RIO<R, X>>,
  __tsplusTrace?: string
): Effect<R & HasScope, never, void> {
  return Effect.addFinalizerExit(finalizer);
}

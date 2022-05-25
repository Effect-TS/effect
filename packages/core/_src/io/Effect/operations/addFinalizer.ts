/**
 * Adds a finalizer to the scope of this workflow. The finalizer is guaranteed
 * to be run when the scope is closed.
 *
 * @tsplus static ets/Effect/Ops addFinalizer
 */
export function addFinalizer<R, X>(
  finalizer: LazyArg<Effect.RIO<R, X>>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, never, void> {
  return Effect.addFinalizerExit(finalizer)
}

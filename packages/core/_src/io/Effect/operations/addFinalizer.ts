/**
 * Adds a finalizer to the scope of this workflow. The finalizer is guaranteed
 * to be run when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops addFinalizer
 */
export function addFinalizer<R, X>(
  finalizer: LazyArg<Effect<R, never, X>>,
  __tsplusTrace?: string
): Effect<R | Scope, never, void> {
  return Effect.addFinalizerExit(finalizer)
}

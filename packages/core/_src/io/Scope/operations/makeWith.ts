import { CloseableScopeInternal } from "@effect/core/io/Scope/operations/_internal/CloseableScopeInternal"

/**
 * Makes a scope. Finalizers added to this scope will be run according to the
 * specified `ExecutionStrategy`.
 *
 * @tsplus static effect/core/io/Scope.Ops makeWith
 */
export function makeWith(
  executionStrategy: LazyArg<ExecutionStrategy>
): Effect<never, never, Scope.Closeable> {
  return ReleaseMap.make.map(
    (releaseMap) =>
      new CloseableScopeInternal(
        Effect.Do()
          .bind("scope", () => Scope.makeWith(ExecutionStrategy.Sequential))
          .bind("finalizer", ({ scope }) => releaseMap.add((exit) => scope.close(exit)))
          .tap(({ finalizer, scope }) => scope.addFinalizerExit(finalizer))
          .map(({ scope }) => scope)
          .uninterruptible,
        (finalizer) => releaseMap.add(finalizer).unit,
        (exit) =>
          Effect.suspendSucceed(
            releaseMap.releaseAll(exit(), executionStrategy()).unit
          )
      )
  )
}

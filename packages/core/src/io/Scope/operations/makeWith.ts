import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { Scope } from "../definition"
import { ReleaseMap } from "../ReleaseMap"
import { CloseableScopeInternal } from "./_internal/CloseableScopeInternal"

/**
 * Makes a scope. Finalizers added to this scope will be run according to the
 * specified `ExecutionStrategy`.
 *
 * @tsplus static ets/ScopeOps makeWith
 */
export function makeWith(
  executionStrategy: LazyArg<ExecutionStrategy>
): UIO<Scope.Closeable> {
  return ReleaseMap.make.map(
    (releaseMap) =>
      new CloseableScopeInternal(
        Effect.Do()
          .bind("scope", () => Scope.makeWith(ExecutionStrategy.Sequential))
          .bind("finalizer", ({ scope }) => releaseMap.add((exit) => scope.close(exit)))
          .tap(({ finalizer, scope }) => scope.addFinalizerExit(finalizer))
          .map(({ scope }) => scope)
          .uninterruptible(),
        (finalizer) => releaseMap.add(finalizer).asUnit(),
        (exit) =>
          Effect.suspendSucceed(
            releaseMap.releaseAll(exit(), executionStrategy()).asUnit()
          )
      )
  )
}

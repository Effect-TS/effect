import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { ExecutionStrategy } from "../../ExecutionStrategy"
import { CloseableScope, Scope } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

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
      new CloseableScope({
        fork: Effect.Do()
          .bind("scope", () => Scope.make)
          .bind("finalizer", ({ scope }) => releaseMap.add((exit) => scope.close(exit)))
          .tap(({ finalizer, scope }) => scope.addFinalizerExit(finalizer))
          .map(({ scope }) => scope),

        addFinalizerExit: (finalizer) => releaseMap.add(finalizer).asUnit(),
        close: (exit) =>
          Effect.suspendSucceed(
            releaseMap.releaseAll(exit(), executionStrategy()).asUnit()
          )
      })
  )
}

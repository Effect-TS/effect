import type { UIO } from "../../Effect/definition"
import { releaseMapReleaseAll_ } from "../../Effect/operations/excl-forEach"
import type { ExecutionStrategy } from "../../Effect/operations/ExecutionStrategy"
import type { Exit } from "../../Exit"
import type { ReleaseMap } from "./definition"

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @tsplus fluent ets/ReleaseMap releaseAll
 */
export function releaseAll_(
  self: ReleaseMap,
  exit: Exit<any, any>,
  executionStrategy: ExecutionStrategy,
  __etsTrace?: string
): UIO<any> {
  return releaseMapReleaseAll_(self, exit, executionStrategy)
}

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @ets_data_first releaseAll_
 */
export function releaseAll(
  exit: Exit<any, any>,
  executionStrategy: ExecutionStrategy,
  __etsTrace?: string
) {
  return (self: ReleaseMap): UIO<any> => self.releaseAll(exit, executionStrategy)
}

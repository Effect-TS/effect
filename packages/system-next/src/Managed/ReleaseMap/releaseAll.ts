// ets_tracing: off

import type { UIO } from "../../Effect/definition"
import { releaseMapReleaseAll_ } from "../../Effect/operations/excl-forEach"
import type { ExecutionStrategy } from "../../Effect/operations/ExecutionStrategy"
import type { Exit } from "../operations/_internal/exit"
import type { ReleaseMap } from "./definition"

export {
  /**
   * Runs the finalizers associated with this scope using the specified
   * execution strategy. After this action finishes, any finalizers added to
   * this scope will be run immediately.
   */
  releaseMapReleaseAll_ as releaseAll_
} from "../../Effect/operations/excl-forEach"

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @ets_data_first releaseAll_
 */
export function releaseAll(
  ex: Exit<any, any>,
  execStrategy: ExecutionStrategy,
  __trace?: string
) {
  return (self: ReleaseMap): UIO<any> => releaseMapReleaseAll_(self, ex, execStrategy)
}

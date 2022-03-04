import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 *
 * @tsplus static ets/STMOps check
 */
export function check(predicate: LazyArg<boolean>) {
  return STM.suspend(predicate() ? STM.unit : STM.retry)
}

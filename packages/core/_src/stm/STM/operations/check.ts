/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 *
 * @tsplus static effect/core/stm/STM.Ops check
 */
export function check(predicate: LazyArg<boolean>) {
  return STM.suspend(predicate() ? STM.unit : STM.retry)
}

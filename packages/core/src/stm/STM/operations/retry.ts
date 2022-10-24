import { STMEffect, STMRetryException } from "@effect/core/stm/STM/definition/primitives"

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @tsplus static effect/core/stm/STM.Ops retry
 * @category retrying
 * @since 1.0.0
 */
export const retry: STM<never, never, never> = new STMEffect(() => {
  throw new STMRetryException()
})

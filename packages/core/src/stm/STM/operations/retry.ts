import type { STM } from "../definition"
import { STMEffect, STMRetryException } from "../definition"

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @tsplus static ets/STMOps retry
 */
export const retry: STM<unknown, never, never> = new STMEffect(() => {
  throw new STMRetryException()
})

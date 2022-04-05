import { STMEffect, STMRetryException } from "@effect-ts/core/stm/STM/definition/primitives";

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @tsplus static ets/STM/Ops retry
 */
export const retry: STM<unknown, never, never> = new STMEffect(() => {
  throw new STMRetryException();
});

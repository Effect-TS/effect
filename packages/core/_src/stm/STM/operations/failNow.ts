import { STMEffect, STMFailException } from "@effect-ts/core/stm/STM/definition/primitives";

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static ets/STM/Ops failNow
 */
export function failNow<E>(e: E): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e);
  });
}

import { STMEffect, STMFailException } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static ets/STM/Ops fail
 */
export function fail<E>(e: LazyArg<E>): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e())
  })
}

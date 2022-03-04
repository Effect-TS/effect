import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"
import { STMEffect, STMFailException } from "../definition"

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static ets/STMOps fail
 */
export function fail<E>(e: LazyArg<E>): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e())
  })
}

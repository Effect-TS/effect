import type { STM } from "../definition"
import { STMEffect, STMFailException } from "../definition"

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static ets/STMOps failNow
 */
export function failNow<E>(e: E): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e)
  })
}

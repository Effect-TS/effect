import type { LazyArg } from "../../../data/Function"
import type { FiberId } from "../../../io/FiberId"
import type { USTM } from "../definition"
import { STMEffect, STMInterruptException } from "../definition"

/**
 * Interrupts the fiber running the effect with the specified fiber id.
 *
 * @tsplus static ets/STMOps interruptAs
 */
export function interruptAs(fiberId: LazyArg<FiberId>): USTM<never> {
  return new STMEffect(() => {
    throw new STMInterruptException(fiberId())
  })
}

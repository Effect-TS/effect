import type { USTM } from "../definition"
import { STM } from "../definition"

/**
 * Interrupts the fiber running the effect.
 *
 * @tsplus static ets/STMOps interrupt
 */
export const interrupt: USTM<never> = STM.fiberId.flatMap((fiberId) =>
  STM.interruptAs(fiberId)
)

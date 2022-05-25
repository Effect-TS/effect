import { STMEffect, STMInterruptException } from "@effect/core/stm/STM/definition/primitives"
/**
 * Interrupts the fiber running the effect with the specified fiber id.
 *
 * @tsplus static ets/STM/Ops interruptAs
 */
export function interruptAs(fiberId: LazyArg<FiberId>): USTM<never> {
  return new STMEffect(() => {
    throw new STMInterruptException(fiberId())
  })
}

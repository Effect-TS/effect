import { STMEffect, STMInterruptException } from "@effect/core/stm/STM/definition/primitives"

/**
 * Interrupts the fiber running the effect with the specified fiber id.
 *
 * @tsplus static effect/core/stm/STM.Ops interruptAs
 * @category constructors
 * @since 1.0.0
 */
export function interruptAs(fiberId: FiberId): USTM<never> {
  return new STMEffect(() => {
    throw new STMInterruptException(fiberId)
  })
}

/**
 * Interrupts the fiber running the effect.
 *
 * @tsplus static effect/core/stm/STM.Ops interrupt
 * @category constructors
 * @since 1.0.0
 */
export const interrupt: USTM<never> = STM.fiberId.flatMap((fiberId) => STM.interruptAs(fiberId))

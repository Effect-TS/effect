/**
 * Interrupts the fiber running the effect.
 *
 * @tsplus static ets/STM/Ops interrupt
 */
export const interrupt: USTM<never> = STM.fiberId.flatMap((fiberId) => STM.interruptAs(fiberId))

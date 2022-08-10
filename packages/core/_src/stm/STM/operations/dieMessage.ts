/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 *
 * @tsplus static effect/core/stm/STM.Ops dieMessage
 */
export function dieMessage(message: string): STM<never, never, never> {
  return STM.sync(() => {
    throw new RuntimeError(message)
  })
}

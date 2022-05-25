import { STMDieException, STMEffect } from "@effect/core/stm/STM/definition/primitives"

/**
 * Kills the fiber running the effect.
 *
 * @tsplus static ets/STM/Ops dieNow
 */
export function dieNow(u: unknown): STM<unknown, never, never> {
  return new STMEffect(() => {
    throw new STMDieException(u)
  })
}

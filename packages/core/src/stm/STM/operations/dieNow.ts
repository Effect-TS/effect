import type { STM } from "../definition"
import { STMDieException, STMEffect } from "../definition"

/**
 * Kills the fiber running the effect.
 *
 * @tsplus static ets/STMOps dieNow
 */
export function dieNow(u: unknown): STM<unknown, never, never> {
  return new STMEffect(() => {
    throw new STMDieException(u)
  })
}

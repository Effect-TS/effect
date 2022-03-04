import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"
import { STMDieException, STMEffect } from "../definition"

/**
 * Kills the fiber running the effect.
 *
 * @tsplus static ets/STMOps die
 */
export function die(u: LazyArg<unknown>): STM<unknown, never, never> {
  return new STMEffect(() => {
    throw new STMDieException(u())
  })
}

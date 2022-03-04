import type { LazyArg } from "../../../data/Function"
import { RuntimeError } from "../../../io/Cause"
import { STM } from "../definition"

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 *
 * @tsplus static ets/STMOps dieMessage
 */
export function dieMessage(message: LazyArg<string>): STM<unknown, never, never> {
  return STM.succeed(() => {
    throw new RuntimeError(message())
  })
}

import type { LazyArg } from "../../../data/Function"
import { Cause, RuntimeError } from "../../Cause"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @tsplus static ets/EffectOps dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): UIO<never> {
  return Effect.failCause(Cause.stackless(Cause.die(new RuntimeError(message()))))
}

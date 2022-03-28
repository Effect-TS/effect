import { RuntimeError } from "../../../io/Cause"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a failing `Take<never, never>` with the specified error message.
 *
 * @tsplus static ets/TakeOps dieMessage
 */
export function dieMessage(message: string): Take<never, never> {
  return new TakeInternal(Exit.die(new RuntimeError(message)))
}

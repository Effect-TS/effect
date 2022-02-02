import { Cause } from "../../Cause"
import type { FiberId } from "../../FiberId"
import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps interrupt
 */
export function interrupt(fiberId: FiberId): Exit<never, never> {
  return Exit.failCause(Cause.interrupt(fiberId))
}

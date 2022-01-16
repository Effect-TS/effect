// ets_tracing: off

import * as Exit from "../../Exit"
import type { FiberId } from "../../FiberId"
import type { Fiber } from ".."
import { done } from "./done"

/**
 * A fiber that is already interrupted.
 */
export function interruptAs(fiberId: FiberId): Fiber<never, never> {
  return done(Exit.interrupt(fiberId))
}

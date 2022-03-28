import { Cause } from "../../../io/Cause"
import type { FiberId } from "../../../io/FiberId"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps interrupt
 */
export function interrupt(
  fiberId: FiberId
): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return Channel.failCause(Cause.interrupt(fiberId))
}

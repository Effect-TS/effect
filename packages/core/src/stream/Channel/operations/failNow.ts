import { Cause } from "../../../io/Cause"
import type { Channel } from "../definition"
import { Fail } from "../definition"

/**
 * Halt a channel with the specified error.
 *
 * @tsplus static ets/ChannelOps failNow
 */
export function failNow<E>(
  e: E
): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => Cause.fail(e))
}

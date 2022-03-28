import type { LazyArg } from "../../../data/Function"
import { Cause } from "../../../io/Cause"
import type { Channel } from "../definition"
import { Fail } from "../definition"

/**
 * Halt a channel with the specified error.
 *
 * @tsplus static ets/ChannelOps fail
 */
export function fail<E>(
  e: LazyArg<E>
): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => Cause.fail(e()))
}

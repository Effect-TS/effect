import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../../io/Cause"
import type { Channel } from "../definition"
import { Fail } from "../definition"

/**
 * Halt a channel with the specified cause.
 *
 * @tsplus static ets/ChannelOps failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>
): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(cause)
}

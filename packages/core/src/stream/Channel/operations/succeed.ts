import type { LazyArg } from "../../../data/Function"
import type { Channel } from "../definition"
import { Succeed } from "../definition"

/**
 * @tsplus static ets/ChannelOps succeed
 */
export function succeed<OutDone>(
  effect: LazyArg<OutDone>
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Succeed(effect)
}

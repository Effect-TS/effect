import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../../io/Exit"
import type { Hub } from "../../../io/Hub"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps toHub
 */
export function toHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<unknown, Err, Elem, Done, never, never, unknown> {
  return Channel.toQueue(hub)
}

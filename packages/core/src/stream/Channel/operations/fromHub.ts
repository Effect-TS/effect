import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../../io/Exit"
import type { Hub } from "../../../io/Hub"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps fromHub
 */
export function fromHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.scoped(hub().subscribe, (queue) => Channel.fromQueue(queue))
}

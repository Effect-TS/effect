import type { Either } from "../../../data/Either"
import type { Exit } from "../../../io/Exit"
import type { Hub } from "../../../io/Hub"
import type { Managed } from "../../../io/Managed"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps fromHubManaged
 */
export function fromHubManaged<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Managed<
  unknown,
  never,
  Channel<unknown, unknown, unknown, unknown, Err, Elem, Done>
> {
  return hub.subscribe().map((queue) => Channel.fromQueue(queue))
}

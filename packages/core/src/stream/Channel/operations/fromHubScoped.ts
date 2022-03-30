import type { Either } from "../../../data/Either"
import type { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Hub } from "../../../io/Hub"
import type { HasScope } from "../../../io/Scope"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps fromHubManaged
 */
export function fromHubManaged<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Effect<
  HasScope,
  never,
  Channel<unknown, unknown, unknown, unknown, Err, Elem, Done>
> {
  return hub.subscribe.map((queue) => Channel.fromQueue(queue))
}

import type { Has, Tag } from "../../../data/Has"
import { Channel } from "../definition"

/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static ets/ChannelOps serviceWith
 */
export function serviceWith<T>(tag: Tag<T>) {
  return <OutDone>(
    f: (service: T) => OutDone
  ): Channel<Has<T>, unknown, unknown, unknown, never, never, OutDone> =>
    Channel.service(tag).map(f)
}

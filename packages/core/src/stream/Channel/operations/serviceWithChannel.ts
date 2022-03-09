import type { Has, Tag } from "../../../data/Has"
import { Channel } from "../definition"

/**
 * Accesses the specified service in the environment of the channel in the
 * context of a channel.
 *
 * @tsplus static ets/ChannelOps serviceWithChannel
 */
export function serviceWithChannel<T>(tag: Tag<T>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    f: (service: T) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env & Has<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.service(tag).flatMap(f)
}

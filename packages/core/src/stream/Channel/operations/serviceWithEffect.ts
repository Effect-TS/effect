import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * Accesses the specified service in the environment of the channel in the
 * context of an effect.
 *
 * @tsplus static ets/ChannelOps serviceWithEffect
 */
export function serviceWithEffect<T>(tag: Tag<T>) {
  return <Env, OutErr, OutDone>(
    f: (service: T) => Effect<Env, OutErr, OutDone>
  ): Channel<Env & Has<T>, unknown, unknown, unknown, OutErr, never, OutDone> =>
    Channel.service(tag).mapEffect(f)
}

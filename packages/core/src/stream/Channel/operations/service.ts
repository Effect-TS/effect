import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static ets/ChannelOps service
 */
export function service<T>(
  tag: Tag<T>
): Channel<Has<T>, unknown, unknown, unknown, never, never, T> {
  return Channel.fromEffect(Effect.service(tag))
}

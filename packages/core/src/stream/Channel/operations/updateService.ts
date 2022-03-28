import type { Has, Tag } from "../../../data/Has"
import type { Channel } from "../definition"

/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus fluent ets/Channel updateService
 */
export function updateService_<Env, InErr, InDone, OutElem, OutErr, OutDone, T>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>
) {
  return (
    f: (_: T) => T
  ): Channel<Env & Has<T>, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...tag.has(f(tag.read(r))) }))
}

/**
 * Updates a service in the environment of this channel.
 */
export const updateService = Pipeable(updateService_)

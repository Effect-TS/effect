import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the channel in the
 * context of a channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops serviceWithChannel
 * @category environment
 * @since 1.0.0
 */
export function serviceWithChannel<T, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  tag: Tag<T>,
  f: (resource: T) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env | T, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.service(tag).flatMap(f)
}

import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops serviceWith
 * @category environment
 * @since 1.0.0
 */
export function serviceWith<T, OutDone>(
  tag: Tag<T>,
  f: (resource: T) => OutDone
): Channel<T, unknown, unknown, unknown, never, never, OutDone> {
  return Channel.service(tag).map(f)
}

/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops serviceWith
 */
export function serviceWith<T, OutDone>(
  tag: Tag<T>,
  f: (resource: T) => OutDone
): Channel<T, unknown, unknown, unknown, never, never, OutDone> {
  return Channel.service(tag).map(f)
}

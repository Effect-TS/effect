import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromHub
 * @category conversions
 * @since 1.0.0
 */
export function fromHub<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.unwrapScoped(hub.subscribe.map((queue) => Channel.fromQueue(queue)))
}

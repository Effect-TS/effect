import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromHubScoped
 * @category conversions
 * @since 1.0.0
 */
export function fromHubScoped<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Effect<
  Scope,
  never,
  Channel<never, unknown, unknown, unknown, Err, Elem, Done>
> {
  return hub.subscribe.map((queue) => Channel.fromQueue(queue))
}

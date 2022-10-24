import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus getter effect/core/stream/Channel toHub
 * @tsplus static effect/core/stream/Channel.Ops toHub
 * @category conversions
 * @since 1.0.0
 */
export function toHub<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Channel<never, Err, Elem, Done, never, never, unknown> {
  return Channel.toQueue(hub)
}

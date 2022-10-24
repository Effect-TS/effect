import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a subscription to a `Hub`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkHub
 * @category conversions
 * @since 1.0.0
 */
export function fromChunkHub<A>(
  hub: Hub<Chunk<A>>
): Stream<never, never, A> {
  return Stream.scoped(hub.subscribe).flatMap((queue) => Stream.fromChunkQueue(queue))
}

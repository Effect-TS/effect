import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkHubWithShutdown
 * @category conversions
 * @since 1.0.0
 */
export function fromChunkHubWithShutdown<A>(
  hub: Hub<Chunk<A>>
): Stream<never, never, A> {
  return Stream.fromChunkHub(hub).ensuring(hub.shutdown)
}

import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkHubScopedWithShutdown
 * @category conversions
 * @since 1.0.0
 */
export function fromChunkHubScopedWithShutdown<A>(
  hub: Hub<Chunk<A>>
): Effect<Scope, never, Stream<never, never, A>> {
  return Stream.fromChunkHubScoped(hub).ensuring(hub.shutdown)
}

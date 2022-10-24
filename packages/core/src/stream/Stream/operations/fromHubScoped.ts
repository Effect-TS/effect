import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"

/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromHubScoped
 * @category conversions
 * @since 1.0.0
 */
export function fromHubScoped<A>(
  hub: Hub<A>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Effect<Scope, never, Stream<never, never, A>> {
  return hub.subscribe.map((queue) => Stream.fromQueueWithShutdown(queue, maxChunkSize))
}

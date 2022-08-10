/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkHubScoped
 */
export function fromChunkHubScoped<A>(
  hub: Hub<Chunk<A>>
): Effect<Scope, never, Stream<never, never, A>> {
  return hub.subscribe.map((queue) => Stream.fromChunkQueue(queue))
}

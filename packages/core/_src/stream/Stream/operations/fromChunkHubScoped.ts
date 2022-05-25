/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @tsplus static ets/Stream/Ops fromChunkHubScoped
 */
export function fromChunkHubScoped<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, Stream<unknown, never, A>> {
  return Effect.succeed(hub).flatMap((hub) => hub.subscribe.map((queue) => Stream.fromChunkQueue(queue)))
}

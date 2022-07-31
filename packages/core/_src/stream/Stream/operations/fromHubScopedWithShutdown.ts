import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"

/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromHubScopedWithShutdown
 */
export function fromHubScopedWithShutdown<A>(
  hub: LazyArg<Hub<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Effect<Scope, never, Stream<never, never, A>> {
  return Effect.sync(hub).flatMap((hub) =>
    Stream.fromHubScoped(hub, maxChunkSize).map((stream) => stream.ensuring(hub.shutdown))
  )
}

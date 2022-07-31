import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"

/**
 * Creates a stream from a subscription to a hub.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromHub
 */
export function fromHub<A>(
  hub: LazyArg<Hub<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Stream<never, never, A> {
  return Stream.scoped(hub().subscribe).flatMap((queue) => Stream.fromQueue(queue, maxChunkSize))
}

/**
 * Creates a stream from a subscription to a `Hub`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkHub
 */
export function fromChunkHub<A>(
  hub: LazyArg<Hub<Chunk<A>>>
): Stream<never, never, A> {
  return Stream.scoped(hub().subscribe).flatMap((queue) => Stream.fromChunkQueue(queue))
}

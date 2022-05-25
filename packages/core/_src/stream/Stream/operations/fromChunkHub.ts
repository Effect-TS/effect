/**
 * Creates a stream from a subscription to a `Hub`.
 *
 * @tsplus static ets/Stream/Ops fromChunkHub
 */
export function fromChunkHub<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.scoped(hub().subscribe).flatMap((queue) => Stream.fromChunkQueue(queue))
}

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static ets/Stream/Ops fromChunkHubWithShutdown
 */
export function fromChunkHubWithShutdown<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return Stream.succeed(hub).flatMap((hub) => Stream.fromChunkHub(hub).ensuring(hub.shutdown))
}

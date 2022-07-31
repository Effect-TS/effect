/**
 * Create a sink which publishes each element to the specified hub. The hub
 * will be shutdown once the stream is closed.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromHubWithShutdown
 */
export function fromHubWithShutdown<In>(
  hub: LazyArg<Hub<In>>
): Sink<never, never, In, never, void> {
  return Sink.fromQueueWithShutdown(hub)
}

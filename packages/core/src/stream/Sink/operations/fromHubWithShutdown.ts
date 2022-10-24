/**
 * Create a sink which publishes each element to the specified hub. The hub
 * will be shutdown once the stream is closed.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromHubWithShutdown
 * @category conversions
 * @since 1.0.0
 */
export function fromHubWithShutdown<In>(hub: Hub<In>): Sink<never, never, In, never, void> {
  return Sink.fromQueueWithShutdown(hub)
}

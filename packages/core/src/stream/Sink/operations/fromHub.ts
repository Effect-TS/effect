/**
 * Create a sink which publishes each element to the specified hub.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromHub
 * @category conversions
 * @since 1.0.0
 */
export function fromHub<In>(hub: Hub<In>): Sink<never, never, In, never, void> {
  return Sink.fromQueue(hub)
}

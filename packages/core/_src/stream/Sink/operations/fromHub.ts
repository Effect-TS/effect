/**
 * Create a sink which publishes each element to the specified hub.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromHub
 */
export function fromHub<In>(hub: Hub<In>): Sink<never, never, In, never, void> {
  return Sink.fromQueue(hub)
}

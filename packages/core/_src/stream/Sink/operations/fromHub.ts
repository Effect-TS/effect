/**
 * Create a sink which publishes each element to the specified hub.
 *
 * @tsplus static ets/Sink/Ops fromHub
 */
export function fromHub<In>(
  hub: LazyArg<Hub<In>>,
  __tsplusTrace?: string
): Sink<never, never, In, never, void> {
  return Sink.fromQueue(hub)
}

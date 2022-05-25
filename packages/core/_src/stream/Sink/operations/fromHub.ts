/**
 * Create a sink which publishes each element to the specified hub.
 *
 * @tsplus static ets/Sink/Ops fromHub
 */
export function fromHub<R, E, In>(
  hub: LazyArg<Hub<In>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.fromQueue(hub)
}

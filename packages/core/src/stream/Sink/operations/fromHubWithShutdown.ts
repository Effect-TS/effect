import type { LazyArg } from "../../../data/Function"
import type { Hub } from "../../../io/Hub"
import { Sink } from "../definition"

/**
 * Create a sink which publishes each element to the specified hub. The hub
 * will be shutdown once the stream is closed.
 *
 * @tsplus static ets/SinkOps fromHubWithShutdown
 */
export function fromHubWithShutdown<R, E, In>(
  hub: LazyArg<Hub<In>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.fromQueueWithShutdown(hub)
}

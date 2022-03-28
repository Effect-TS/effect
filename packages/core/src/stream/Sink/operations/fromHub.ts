import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import { Sink } from "../definition"

/**
 * Create a sink which publishes each element to the specified hub.
 *
 * @tsplus static ets/SinkOps fromHub
 */
export function fromHub<R, E, In>(
  hub: LazyArg<XHub<R, never, E, unknown, In, unknown>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.fromQueue(hub().toQueue())
}

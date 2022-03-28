import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus fluent ets/Sink dropLeftover
 */
export function dropLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, never, Z> {
  concreteSink(self)
  return new SinkInternal(self.channel.drain())
}

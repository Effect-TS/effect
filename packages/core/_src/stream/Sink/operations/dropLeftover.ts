import { concreteSink, SinkInternal } from "@effect-ts/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * @tsplus fluent ets/Sink dropLeftover
 */
export function dropLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, never, Z> {
  concreteSink(self);
  return new SinkInternal(self.channel.drain());
}

import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Transforms this sink's result.
 *
 * @tsplus fluent ets/Sink map
 */
export function map_<R, E, In, L, Z, Z2>(
  self: Sink<R, E, In, L, Z>,
  f: (z: Z) => Z2,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z2> {
  concreteSink(self);
  return new SinkInternal(self.channel.map(f));
}

/**
 * Transforms this sink's result.
 *
 * @tsplus static ets/Sink/Aspects map
 */
export const map = Pipeable(map_);

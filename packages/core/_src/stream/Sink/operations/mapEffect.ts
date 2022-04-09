import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Effectfully transforms this sink's result.
 *
 * @tsplus fluent ets/Sink mapEffect
 */
export function mapEffect_<R, E, R2, E2, In, L, Z, Z2>(
  self: Sink<R, E, In, L, Z>,
  f: (z: Z) => Effect<R2, E2, Z2>,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In, L, Z2> {
  concreteSink(self);
  return new SinkInternal(self.channel.mapEffect(f));
}

/**
 * Effectfully transforms this sink's result.
 *
 * @tsplus static ets/Sink/Aspects mapEffect
 */
export const mapEffect = Pipeable(mapEffect_);

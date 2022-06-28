import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Effectfully transforms this sink's result.
 *
 * @tsplus static effect/core/stream/Sink.Aspects mapEffect
 * @tsplus pipeable effect/core/stream/Sink mapEffect
 */
export function mapEffect<R2, E2, Z, Z2>(
  f: (z: Z) => Effect<R2, E2, Z2>,
  __tsplusTrace?: string
) {
  return <R, E, In, L>(self: Sink<R, E, In, L, Z>): Sink<R | R2, E | E2, In, L, Z2> => {
    concreteSink(self)
    return new SinkInternal(self.channel.mapEffect(f))
  }
}

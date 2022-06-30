import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Transforms this sink's result.
 *
 * @tsplus static effect/core/stream/Sink.Aspects map
 * @tsplus pipeable effect/core/stream/Sink map
 */
export function map<Z, Z2>(f: (z: Z) => Z2, __tsplusTrace?: string) {
  return <R, E, In, L>(self: Sink<R, E, In, L, Z>): Sink<R, E, In, L, Z2> => {
    concreteSink(self)
    return new SinkInternal(self.channel.map(f))
  }
}

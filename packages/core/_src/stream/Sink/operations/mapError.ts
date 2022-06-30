import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Transforms the errors emitted by this sink using `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects mapError
 * @tsplus pipeable effect/core/stream/Sink mapError
 */
export function mapError<E, E2>(f: (z: E) => E2, __tsplusTrace?: string) {
  return <R, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E2, In, L, Z> => {
    concreteSink(self)
    return new SinkInternal(self.channel.mapError(f))
  }
}

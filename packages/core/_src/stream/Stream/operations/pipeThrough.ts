import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Pipes all of the values from this stream through the provided sink.
 *
 * @tsplus static effect/core/stream/Stream.Aspects pipeThrough
 * @tsplus pipeable effect/core/stream/Stream pipeThrough
 */
export function pipeThrough<A, R2, E2, L, Z>(
  sink: LazyArg<Sink<R2, E2, A, L, Z>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, L> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.pipeToOrFail(() => {
        const sink0 = sink()
        concreteSink(sink0)
        return sink0.channel
      })
    )
  }
}

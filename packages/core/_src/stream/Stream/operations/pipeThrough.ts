import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Pipes all of the values from this stream through the provided sink.
 *
 * @tsplus fluent ets/Stream pipeThrough
 */
export function pipeThrough_<R, E, A, R2, E2, L, Z>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, L, Z>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, L> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.pipeToOrFail(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
  )
}

/**
 * Pipes all of the values from this stream through the provided sink.
 *
 * @tsplus static ets/Stream/Aspects pipeThrough
 */
export const pipeThrough = Pipeable(pipeThrough_)

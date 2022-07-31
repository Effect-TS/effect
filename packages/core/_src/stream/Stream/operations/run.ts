import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Runs the sink on the stream to produce either the sink's result or an
 * error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects run
 * @tsplus pipeable effect/core/stream/Stream run
 */
export function run<A, R2, E2, Z>(
  sink: LazyArg<Sink<R2, E2, A, unknown, Z>>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, Z> => {
    concreteStream(self)
    return self.channel
      .pipeToOrFail(() => {
        const sink0 = sink()
        concreteSink(sink0)
        return sink0.channel
      })
      .runDrain
  }
}

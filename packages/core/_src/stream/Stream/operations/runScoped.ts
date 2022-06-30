import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus static effect/core/stream/Stream.Aspects runScoped
 * @tsplus pipeable effect/core/stream/Stream runScoped
 */
export function runScoped<A, R2, E2, B>(
  sink: LazyArg<Sink<R2, E2, A, unknown, B>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, B> => {
    concreteStream(self)
    return self.channel
      .pipeToOrFail(() => {
        const sink0 = sink()
        concreteSink(sink0)
        return sink0.channel
      })
      .drain
      .runScoped
  }
}

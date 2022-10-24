import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus static effect/core/stream/Stream.Aspects runScoped
 * @tsplus pipeable effect/core/stream/Stream runScoped
 * @category destructors
 * @since 1.0.0
 */
export function runScoped<A, R2, E2, B>(sink: Sink<R2, E2, A, unknown, B>) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, B> => {
    concreteStream(self)
    concreteSink(sink)
    return self.channel.pipeToOrFail(sink.channel).drain.runScoped
  }
}

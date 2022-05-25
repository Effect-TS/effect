import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus fluent ets/Stream runScoped
 */
export function runScoped_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, unknown, B>>,
  __tsplusTrace?: string
): Effect<R & R2 & Has<Scope>, E | E2, B> {
  concreteStream(self)
  return self.channel
    .pipeToOrFail(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
    .drain()
    .runScoped()
}

/**
 * @tsplus static ets/Stream/Aspects runScoped
 */
export const runScoped = Pipeable(runScoped_)

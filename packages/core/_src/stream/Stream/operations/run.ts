import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Runs the sink on the stream to produce either the sink's result or an
 * error.
 *
 * @tsplus fluent ets/Stream run
 */
export function run_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, unknown, Z>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, Z> {
  concreteStream(self)
  return self.channel
    .pipeToOrFail(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
    .runDrain
}

/**
 * Runs the sink on the stream to produce either the sink's result or an
 * error.
 *
 * @tsplus static ets/Stream/Aspects run
 */
export const run = Pipeable(run_)

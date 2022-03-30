import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { Sink } from "../../Sink"
import { concreteSink } from "../../Sink/operations/_internal/SinkInternal"
import type { Stream } from "../../Stream"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * @tsplus fluent ets/Stream runScoped
 */
export function runScoped_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, unknown, B>>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E | E2, B> {
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

export const runScoped = Pipeable(runScoped_)

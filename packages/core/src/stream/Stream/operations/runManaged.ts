import type { LazyArg } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import type { Sink } from "../../Sink"
import { concreteSink } from "../../Sink/operations/_internal/SinkInternal"
import type { Stream } from "../../Stream"
import { concreteStream } from "./_internal/StreamInternal"

/**
 * @tsplus fluent ets/Stream runManaged
 */
export function runManaged_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, unknown, B>>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, B> {
  concreteStream(self)
  return self.channel
    .pipeToOrFail(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
    .drain()
    .runManaged()
}

export const runManaged = Pipeable(runManaged_)

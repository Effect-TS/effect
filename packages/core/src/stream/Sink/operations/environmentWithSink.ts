import { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Accesses the environment of the sink in the context of a sink.
 *
 * @tsplus static ets/SinkOps environmentWithSink
 */
export function environmentWithSink<R0, R, E, In, L, Z>(
  f: (r: R0) => Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R0 & R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrap(
      Effect.environmentWith((r: R0) => {
        const sink = f(r)
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}

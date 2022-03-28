import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Returns a lazily constructed sink that may require effects for its
 * creation.
 *
 * @tsplus static ets/SinkOps suspend
 */
export function suspend<R, E, In, L, Z>(
  sink: LazyArg<Sink<R, E, In, L, Z>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.suspend(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
  )
}

import type { LazyArg } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink produced from a managed effect.
 *
 * @tsplus static ets/SinkOps unwrapManaged
 */
export function unwrapManaged<R, E, In, L, Z>(
  managed: LazyArg<Managed<R, E, Sink<R, E, In, L, Z>>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrapManaged(
      managed().map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}

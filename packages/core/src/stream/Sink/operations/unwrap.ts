import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink produced from an effect.
 *
 * @tsplus static ets/SinkOps unwrap
 */
export function unwrap<R, E, In, L, Z>(
  effect: LazyArg<Effect<R, E, Sink<R, E, In, L, Z>>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrap(
      effect().map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}

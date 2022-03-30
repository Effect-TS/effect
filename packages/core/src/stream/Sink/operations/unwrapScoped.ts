import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink produced from a scoped effect.
 *
 * @tsplus static ets/SinkOps unwrapScoped
 */
export function unwrapScoped<R, E, In, L, Z>(
  effect: LazyArg<Effect<R & HasScope, E, Sink<R, E, In, L, Z>>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrapScoped(
      effect().map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}

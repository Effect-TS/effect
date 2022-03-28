import { Effect } from "../../../io/Effect"
import { Sink } from "../definition"

/**
 * @tsplus static ets/SinkOps never
 */
export const never: Sink<unknown, never, unknown, unknown, never> = Sink.fromEffect(
  Effect.never
)

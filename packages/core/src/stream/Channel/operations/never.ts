import { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps never
 */
export const never: Channel<unknown, unknown, unknown, unknown, never, never, never> =
  Channel.fromEffect(Effect.never)

import { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * Accesses the whole environment of the channel.
 *
 * @tsplus static ets/ChannelOps environment
 */
export function environment<Env>(): Channel<
  Env,
  unknown,
  unknown,
  unknown,
  never,
  never,
  Env
> {
  return Channel.fromEffect(Effect.environment<Env>())
}

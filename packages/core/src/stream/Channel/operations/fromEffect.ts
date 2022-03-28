import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Channel } from "../definition"
import { FromEffect } from "../definition"

/**
 * Use an effect to end a channel.
 *
 * @tsplus static ets/ChannelOps fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>
): Channel<R, unknown, unknown, unknown, E, never, A> {
  return new FromEffect(effect)
}

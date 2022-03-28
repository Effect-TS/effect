import { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps succeedWith
 */
export function succeedWith<R, Z>(
  f: (r: R) => Z
): Channel<R, unknown, unknown, unknown, never, never, Z> {
  return Channel.fromEffect(Effect.environmentWith(f))
}

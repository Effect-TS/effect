import type { Channel } from "../definition"
import { SucceedNow } from "../definition"

/**
 * @tsplus static ets/ChannelOps succeedNow
 */
export function succeedNow<OutDone>(
  result: OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new SucceedNow(result)
}

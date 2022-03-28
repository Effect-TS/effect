import type { LazyArg } from "../../../data/Function"
import type { Channel } from "../definition"
import { Emit } from "../definition"

/**
 * Writes an output to the channel.
 *
 * @tsplus static ets/ChannelOps write
 */
export function write<OutElem>(
  out: LazyArg<OutElem>
): Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}

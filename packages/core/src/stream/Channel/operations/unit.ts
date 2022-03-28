import { constVoid } from "../../../data/Function"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps unit
 */
export const unit: Channel<unknown, unknown, unknown, unknown, never, never, void> =
  Channel.succeed(constVoid)

import { Option } from "../../../data/Option"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps read
 */
export function read<In>(): Channel<
  unknown,
  unknown,
  In,
  unknown,
  Option<never>,
  never,
  In
> {
  return Channel.readOrFail(Option.none)
}

import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>
): Channel<unknown, unknown, unknown, unknown, Option<never>, never, A> {
  return Channel.suspend(option().fold(Channel.fail(Option.none), Channel.succeedNow))
}

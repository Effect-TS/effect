import { constUndefined } from "../../../data/Function"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps concatAll
 */
export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return Channel.concatAllWith(channels, constUndefined, constUndefined)
}

import { constVoid } from "../../../data/Function"
import { Channel } from "../definition"
import { MergeStrategy } from "../MergeStrategy"

/**
 * @tsplus static ets/ChannelOps mergeAll
 */
export function mergeAll_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>,
    unknown
  >,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  unknown
> {
  return Channel.mergeAllWith(channels, n, constVoid, bufferSize, mergeStrategy)
}

export const mergeAll = Pipeable(mergeAll_)

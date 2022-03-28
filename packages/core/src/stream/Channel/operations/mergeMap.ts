import { Channel } from "../definition"
import { MergeStrategy } from "../MergeStrategy"

/**
 * @tsplus fluent ets/Channel mergeMap
 */
export function mergeMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  Z
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (
    outElem: OutElem
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  unknown
> {
  return Channel.mergeAll(self.mapOut(f), n, bufferSize, mergeStrategy)
}

export const mergeMap = Pipeable(mergeMap_)

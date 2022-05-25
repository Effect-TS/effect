/**
 * @tsplus fluent ets/Channel mergeOut
 */
export function mergeOut_<
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
  OutElem1,
  OutDone,
  Z
>(
  self: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
    OutDone
  >,
  n: number
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  unknown
> {
  return Channel.mergeAll(self.mapOut(identity), n)
}

/**
 * @tsplus static ets/Channel/Aspects mergeOut
 */
export const mergeOut = Pipeable(mergeOut_)

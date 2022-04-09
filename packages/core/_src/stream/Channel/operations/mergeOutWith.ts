/**
 * @tsplus fluent ets/Channel mergeOutWith
 */
export function mergeOutWith_<
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
  OutDone1
>(
  self: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    OutDone1
  >,
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  OutDone1
> {
  return Channel.mergeAllWith(self.mapOut(identity), n, f);
}

/**
 * @tsplus static ets/Channel/Aspects mergeOutWith
 */
export const mergeOutWith = Pipeable(mergeOutWith_);

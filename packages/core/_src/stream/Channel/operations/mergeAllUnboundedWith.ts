/**
 * @tsplus static ets/Channel/Ops mergeAllUnboundedWith
 */
export function mergeAllUnboundedWith_<
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
  OutElem,
  OutDone
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  f: (o1: OutDone, o2: OutDone) => OutDone
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return Channel.mergeAllWith(channels, Number.MAX_SAFE_INTEGER, f);
}

/**
 * @tsplus static ets/Channel/Aspects mergeAllUnboundedWith
 */
export const mergeAllUnboundedWith = Pipeable(mergeAllUnboundedWith_);

/**
 * @tsplus static effect/core/stream/Channel.Aspects mergeOutWith
 * @tsplus pipeable effect/core/stream/Channel mergeOutWith
 */
export function mergeOutWith<OutDone1>(
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
) {
  return <
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
    OutElem1
  >(
    self: Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
      OutDone1
    >
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    OutDone1
  > => Channel.mergeAllWith(self.mapOut(identity), n, f)
}

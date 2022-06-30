/**
 * @tsplus static effect/core/stream/Channel.Aspects zipParRight
 * @tsplus pipeable effect/core/stream/Channel zipParRight
 */
export function zipParRight<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone1
  > => self.zipPar(that).map((tuple) => tuple.get(1))
}

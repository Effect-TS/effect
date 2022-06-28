/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with the result
 * of calling the specified function on the terminal values of both channels.
 *
 * @tsplus static effect/core/stream/Channel.Aspects zipWith
 * @tsplus pipeable effect/core/stream/Channel zipWith
 */
export function zipWith<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2
>(
  that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>,
  f: (outDone: OutDone, outDone1: OutDone1) => OutDone2
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone2
  > => self.flatMap((a) => that().map((b) => f(a, b)))
}

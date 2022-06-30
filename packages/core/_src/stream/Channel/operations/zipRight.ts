/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with the
 * terminal value of that channel.
 *
 * @tsplus pipeable-operator effect/core/stream/Channel >
 * @tsplus static effect/core/stream/Channel.Aspects zipRight
 * @tsplus pipeable effect/core/stream/Channel zipRight
 */
export function zipRight<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone1
  > => self.flatMap(that)
}

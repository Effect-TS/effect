/**
 * @tsplus static effect/core/stream/Channel.Aspects foldChannel
 * @tsplus pipeable effect/core/stream/Channel foldChannel
 */
export function foldChannel<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  onErr: (
    oErr: OutErr
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1 | Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr1,
    OutElem | OutElem2 | OutElem1,
    OutDone2 | OutDone1
  > =>
    self.foldCauseChannel((_) => {
      return _.failureOrCause.fold(
        (err) => onErr(err),
        (cause) => Channel.failCause(cause)
      )
    }, onSucc)
}

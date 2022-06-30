import { ContinuationK, Fold } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Fold the channel exposing success and full error cause.
 *
 * @tsplus static effect/core/stream/Channel.Aspects foldCauseChannel
 * @tsplus pipeable effect/core/stream/Channel foldCauseChannel
 */
export function foldCauseChannel<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  onErr: (
    c: Cause<OutErr>
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (
    o: OutDone
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1 | Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr3,
    OutElem | OutElem1 | OutElem2,
    OutDone2 | OutDone3
  > =>
    new Fold<
      Env | Env1 | Env2,
      InErr & InErr1 & InErr2,
      InElem & InElem1 & InElem2,
      InDone & InDone1 & InDone2,
      OutErr2 | OutErr3,
      OutElem | OutElem1 | OutElem2,
      OutDone2 | OutDone3,
      OutErr,
      OutDone
    >(
      self,
      new ContinuationK<
        Env | Env1 | Env2,
        InErr & InErr1 & InErr2,
        InElem & InElem1 & InElem2,
        InDone & InDone1 & InDone2,
        OutErr,
        OutErr2 | OutErr3,
        OutElem | OutElem1 | OutElem2,
        OutDone,
        OutDone2 | OutDone3
      >(onSucc, onErr)
    )
}

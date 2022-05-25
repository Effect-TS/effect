import { ContinuationK, Fold } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Fold the channel exposing success and full error cause.
 *
 * @tsplus fluent ets/Channel foldCauseChannel
 */
export function foldCauseChannel_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    c: Cause<OutErr>
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (
    o: OutDone
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return new Fold<
    Env & Env1 & Env2,
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
      Env & Env1 & Env2,
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

/**
 * Fold the channel exposing success and full error cause.
 *
 * @tsplus static ets/Channel/Aspects foldCauseChannel
 */
export const foldCauseChannel = Pipeable(foldCauseChannel_)

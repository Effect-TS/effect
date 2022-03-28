import { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel foldChannel
 */
export function foldChannel_<
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
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    oErr: OutErr
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr1,
  OutElem | OutElem2 | OutElem1,
  OutDone2 | OutDone1
> {
  return self.foldCauseChannel((_) => {
    return _.failureOrCause().fold(
      (err) => onErr(err),
      (cause) => Channel.failCause(cause)
    )
  }, onSucc)
}

export const foldChannel = Pipeable(foldChannel_)

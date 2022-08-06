import { ContinuationK, Fold } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Returns a new channel that is the same as this one, except if this channel
 * errors for any cause at all, then the returned channel will switch over to
 * using the fallback channel returned by the specified error handler.
 *
 * @tsplus static effect/core/stream/Channel.Aspects catchAllCause
 * @tsplus pipeable effect/core/stream/Channel catchAllCause
 */
export function catchAllCause<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone1
>(
  f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1
  > =>
    new Fold<
      Env | Env1,
      InErr & InErr1,
      InElem & InElem1,
      InDone & InDone1,
      OutErr1,
      OutElem | OutElem1,
      OutDone | OutDone1,
      OutErr,
      OutDone | OutDone1
    >(self, new ContinuationK(Channel.succeed, f))
}

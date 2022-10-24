import { ContinuationK, Fold } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Returns a new channel, which sequentially combines this channel, together
 * with the provided factory function, which creates a second channel based on
 * the terminal value of this channel. The result is a channel that will first
 * perform the functions of this channel, before performing the functions of
 * the created channel (including yielding its terminal value).
 *
 * @tsplus static effect/core/stream/Channel.Aspects flatMap
 * @tsplus pipeable effect/core/stream/Channel flatMap
 * @category sequencing
 * @since 1.0.0
 */
export function flatMap<
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>) {
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
  > =>
    new Fold<
      Env | Env1,
      InErr & InErr1,
      InElem & InElem1,
      InDone & InDone1,
      OutErr | OutErr1,
      OutElem | OutElem1,
      OutDone2,
      OutErr | OutErr1,
      OutDone
    >(self, new ContinuationK(f, (cause) => Channel.failCause(cause)))
}

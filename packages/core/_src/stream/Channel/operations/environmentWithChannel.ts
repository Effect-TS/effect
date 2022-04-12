/**
 * Accesses the environment of the channel in the context of a channel.
 *
 * @tsplus static ets/Channel/Ops environmentWithChannel
 */
export function environmentWithChannel<
  R,
  R1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  f: (env: Env<R>) => Channel<R1, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<R & R1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.environment<R>().flatMap(f);
}

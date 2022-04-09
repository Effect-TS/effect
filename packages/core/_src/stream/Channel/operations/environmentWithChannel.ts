/**
 * Accesses the environment of the channel in the context of a channel.
 *
 * @tsplus static ets/Channel/Ops environmentWithChannel
 */
export function environmentWithChannel<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  f: (env: Env) => Channel<Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.environment<Env>().flatMap(f);
}

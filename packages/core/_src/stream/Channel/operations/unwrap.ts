/**
 * Makes a channel from an effect that returns a channel in case of success.
 *
 * @tsplus static ets/Channel/Ops unwrap
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: LazyArg<
    Effect<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
  >
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Channel.fromEffect(channel).flatten();
}

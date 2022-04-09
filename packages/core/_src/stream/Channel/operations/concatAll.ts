/**
 * @tsplus static ets/Channel/Ops concatAll
 */
export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return Channel.concatAllWith(channels, () => undefined, () => undefined);
}

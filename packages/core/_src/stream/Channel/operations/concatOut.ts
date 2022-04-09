/**
 * Returns a new channel, which is the concatenation of all the channels that
 * are written out by this channel. This method may only be called on channels
 * that output other channels.
 *
 * @tsplus fluent ets/Channel concatOut
 */
export function concatOut<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    OutDone
  >
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return Channel.concatAll(self);
}

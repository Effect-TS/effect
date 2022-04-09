/**
 * Repeats this channel forever.
 *
 * @tsplus fluent ets/Channel repeated
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  __tsplusTrace?: string
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return self > repeated(self);
}

/**
 * Makes a channel from an effect that returns a channel in case of success.
 *
 * @tsplus static effect/core/stream/Channel.Ops unwrap
 */
export function unwrap<R, E, R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Effect<R, E, Channel<R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R | R2, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Channel.fromEffect(channel).flatten
}

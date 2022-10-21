/**
 * Repeats this channel forever.
 *
 * @tsplus getter effect/core/stream/Channel repeated
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return self.flatMap(() => repeated(self))
}

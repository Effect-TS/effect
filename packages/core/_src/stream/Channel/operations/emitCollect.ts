/**
 * Returns a new channel that collects the output and terminal value of this
 * channel, which it then writes as output of the returned channel.
 *
 * @tsplus getter ets/Channel emitCollect
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, Tuple<[Chunk<OutElem>, OutDone]>, void> {
  return self.doneCollect.flatMap((t) => Channel.write(t))
}

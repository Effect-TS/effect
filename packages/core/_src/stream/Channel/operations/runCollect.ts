/**
 * @tsplus getter ets/Channel runCollect
 */
export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, Tuple<[Chunk<OutElem>, OutDone]>> {
  return self.doneCollect.run
}

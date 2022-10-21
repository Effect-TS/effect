/**
 * @tsplus getter effect/core/stream/Channel runCollect
 */
export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, readonly [Chunk<OutElem>, OutDone]> {
  return self.doneCollect.run
}

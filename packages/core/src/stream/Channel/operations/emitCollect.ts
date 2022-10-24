import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Returns a new channel that collects the output and terminal value of this
 * channel, which it then writes as output of the returned channel.
 *
 * @tsplus getter effect/core/stream/Channel emitCollect
 * @category mutations
 * @since 1.0.0
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, readonly [Chunk<OutElem>, OutDone], void> {
  return self.doneCollect.flatMap((t) => Channel.write(t))
}

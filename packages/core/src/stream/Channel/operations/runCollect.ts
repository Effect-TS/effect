import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../../../io/Effect"
import type { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel runCollect
 */
export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, Tuple<[Chunk<OutElem>, OutDone]>> {
  return self.doneCollect().run()
}

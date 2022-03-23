import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Stream } from "../../Stream"
import { StreamInternal } from "../../Stream/operations/_internal/StreamInternal"
import type { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel toStream
 */
export function toStream<Env, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, Chunk<OutElem>, OutDone>,
  __tsplusTrace?: string
): Stream<Env, OutErr, OutElem> {
  return new StreamInternal(self)
}

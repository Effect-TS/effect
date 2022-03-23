import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Sink } from "../../Sink"
import { SinkInternal } from "../../Sink/operations/_internal/SinkInternal"
import type { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel toSink
 */
export function toSink<Env, InErr, InElem, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, Chunk<InElem>, unknown, OutErr, Chunk<OutElem>, OutDone>,
  __tsplusTrace?: string
): Sink<Env, OutErr, InElem, OutElem, OutDone> {
  return new SinkInternal(self)
}

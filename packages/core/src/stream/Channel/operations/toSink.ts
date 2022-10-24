import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus getter effect/core/stream/Channel toSink
 * @tsplus static effect/core/stream/Channel.Ops toSink
 * @category conversions
 * @since 1.0.0
 */
export function toSink<Env, InErr, InElem, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, Chunk<InElem>, unknown, OutErr, Chunk<OutElem>, OutDone>
): Sink<Env, OutErr, InElem, OutElem, OutDone> {
  return new SinkInternal(self)
}

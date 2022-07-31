import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus getter effect/core/stream/Channel toSink
 * @tsplus static effect/core/stream/Channel.Ops toSink
 */
export function toSink<Env, InErr, InElem, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, Chunk<InElem>, unknown, OutErr, Chunk<OutElem>, OutDone>
): Sink<Env, OutErr, InElem, OutElem, OutDone> {
  return new SinkInternal(self)
}

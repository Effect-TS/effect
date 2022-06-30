import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * @tsplus getter effect/core/stream/Channel toStream
 * @tsplus static effect/core/stream/Channel.Ops toStream
 */
export function toStream<Env, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, Chunk<OutElem>, OutDone>,
  __tsplusTrace?: string
): Stream<Env, OutErr, OutElem> {
  return new StreamInternal(self)
}

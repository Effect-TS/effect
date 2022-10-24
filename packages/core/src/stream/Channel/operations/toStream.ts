import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus getter effect/core/stream/Channel toStream
 * @tsplus static effect/core/stream/Channel.Ops toStream
 * @category conversions
 * @since 1.0.0
 */
export function toStream<Env, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, Chunk<OutElem>, OutDone>
): Stream<Env, OutErr, OutElem> {
  return new StreamInternal(self)
}

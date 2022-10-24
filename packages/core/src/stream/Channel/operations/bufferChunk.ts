import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Channel.Ops bufferChunk
 * @category constructors
 * @since 1.0.0
 */
export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref<Chunk.Chunk<InElem>>
): Channel<never, InErr, Chunk.Chunk<InElem>, InDone, InErr, Chunk.Chunk<InElem>, InDone> {
  return Channel.buffer<Chunk.Chunk<InElem>, InErr, InDone>(Chunk.empty, Chunk.isEmpty, ref)
}

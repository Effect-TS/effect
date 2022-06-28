/**
 * @tsplus static effect/core/stream/Channel.Ops bufferChunk
 */
export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref<Chunk<InElem>>
): Channel<never, InErr, Chunk<InElem>, InDone, InErr, Chunk<InElem>, InDone> {
  return Channel.buffer<Chunk<InElem>, InErr, InDone>(
    Chunk.empty<InElem>(),
    (chunk) => chunk.isEmpty,
    ref
  )
}

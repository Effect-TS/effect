/**
 * @tsplus static ets/Channel/Ops bufferChunk
 */
export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref<Chunk<InElem>>
): Channel<unknown, InErr, Chunk<InElem>, InDone, InErr, Chunk<InElem>, InDone> {
  return Channel.buffer<Chunk<InElem>, InErr, InDone>(
    Chunk.empty<InElem>(),
    (chunk) => chunk.isEmpty(),
    ref
  );
}

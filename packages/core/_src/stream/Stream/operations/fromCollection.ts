/**
 * Creates a stream from an Collection collection of values.
 *
 * @tsplus static ets/Stream/Ops fromCollection
 */
export function fromCollection<A>(
  as: LazyArg<Collection<A>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.fromChunk(Chunk.from(as()))
}

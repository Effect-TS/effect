import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Stream } from "../definition"

/**
 * Creates a stream from an iterable collection of values.
 *
 * @tsplus static ets/StreamOps fromIterable
 */
export function fromIterable<A>(
  as: LazyArg<Iterable<A>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.fromChunk(Chunk.from(as()))
}

import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Stream } from "../definition"

/**
 * Creates a single-valued pure stream.
 *
 * @tsplus static ets/StreamOps succeed
 */
export function succeed<A>(
  a: LazyArg<A>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.fromChunk(Chunk.single(a()))
}

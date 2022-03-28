import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Stream } from "../definition"

/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @tsplus static ets/StreamOps concatAll
 */
export function concatAll<R, E, A>(
  streams: LazyArg<Chunk<Stream<R, E, A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.suspend(
    streams().reduce(Stream.empty as Stream<R, E, A>, (acc, a) => acc + a)
  )
}

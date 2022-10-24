import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops concatAll
 * @category mutations
 * @since 1.0.0
 */
export function concatAll<R, E, A>(
  streams: Chunk.Chunk<Stream<R, E, A>>
): Stream<R, E, A> {
  return pipe(
    streams,
    Chunk.reduce(Stream.empty as Stream<R, E, A>, (acc, a) => acc.concat(a))
  )
}

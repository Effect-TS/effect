import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export function zipRightChunks<A, B>(
  leftChunk: Chunk.Chunk<A>,
  rightChunk: Chunk.Chunk<B>
): readonly [Chunk.Chunk<B>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<B>>] {
  const leftChunkSize = leftChunk.length
  const rightChunkSize = rightChunk.length
  return leftChunkSize > rightChunkSize
    ? [
      rightChunk,
      Either.left(pipe(leftChunk, Chunk.drop(rightChunkSize)))
    ]
    : [
      pipe(rightChunk, Chunk.take(leftChunkSize)),
      Either.right(pipe(rightChunk, Chunk.drop(leftChunkSize)))
    ]
}

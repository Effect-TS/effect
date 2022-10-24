import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export function zipLeftChunks<A, B>(
  leftChunk: Chunk.Chunk<A>,
  rightChunk: Chunk.Chunk<B>
): readonly [Chunk.Chunk<A>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<B>>] {
  const leftChunkSize = leftChunk.length
  const rightChunkSize = rightChunk.length
  return leftChunkSize > rightChunkSize
    ? [
      pipe(leftChunk, Chunk.take(rightChunkSize)),
      Either.left(pipe(leftChunk, Chunk.drop(rightChunkSize)))
    ]
    : [
      leftChunk,
      Either.right(pipe(rightChunk, Chunk.drop(leftChunkSize)))
    ]
}

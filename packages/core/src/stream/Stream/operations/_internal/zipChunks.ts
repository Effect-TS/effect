import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export function zipChunks<A, A2, A3>(
  leftChunk: Chunk.Chunk<A>,
  rightChunk: Chunk.Chunk<A2>,
  f: (a: A, b: A2) => A3
): readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>] {
  const leftChunkSize = leftChunk.length
  const rightChunkSize = rightChunk.length
  return leftChunkSize > rightChunkSize
    ? [
      pipe(leftChunk, Chunk.take(rightChunkSize), Chunk.zipWith(rightChunk, f)),
      Either.left(pipe(leftChunk, Chunk.drop(rightChunkSize)))
    ]
    : [
      pipe(leftChunk, Chunk.zipWith(pipe(rightChunk, Chunk.take(leftChunkSize)), f)),
      Either.right(pipe(rightChunk, Chunk.drop(leftChunkSize)))
    ]
}

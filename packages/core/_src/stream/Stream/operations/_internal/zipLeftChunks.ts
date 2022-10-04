export function zipLeftChunks<A, B>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<B>
): readonly [Chunk<A>, Either<Chunk<A>, Chunk<B>>] {
  const leftChunkSize = leftChunk.size
  const rightChunkSize = rightChunk.size
  return leftChunkSize > rightChunkSize
    ? [leftChunk.take(rightChunkSize), Either.left(leftChunk.drop(rightChunkSize))]
    : [leftChunk, Either.right(rightChunk.drop(leftChunkSize))]
}

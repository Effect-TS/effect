export function zipRightChunks<A, B>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<B>
): readonly [Chunk<B>, Either<Chunk<A>, Chunk<B>>] {
  const leftChunkSize = leftChunk.size
  const rightChunkSize = rightChunk.size
  return leftChunkSize > rightChunkSize
    ? [rightChunk, Either.left(leftChunk.drop(rightChunkSize))]
    : [rightChunk.take(leftChunkSize), Either.right(rightChunk.drop(leftChunkSize))]
}

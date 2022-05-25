export function zipLeftChunks<A, B>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<B>
): Tuple<[Chunk<A>, Either<Chunk<A>, Chunk<B>>]> {
  const leftChunkSize = leftChunk.size
  const rightChunkSize = rightChunk.size
  return leftChunkSize > rightChunkSize
    ? Tuple(leftChunk.take(rightChunkSize), Either.left(leftChunk.drop(rightChunkSize)))
    : Tuple(leftChunk, Either.right(rightChunk.drop(leftChunkSize)))
}

export function zipChunks<A, A2, A3>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<A2>,
  f: (a: A, b: A2) => A3
): Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]> {
  const leftChunkSize = leftChunk.size;
  const rightChunkSize = rightChunk.size;
  return leftChunkSize > rightChunkSize
    ? Tuple(
      leftChunk.take(rightChunkSize).zipWith(rightChunk, f),
      Either.left(leftChunk.drop(rightChunkSize))
    )
    : Tuple(
      leftChunk.zipWith(rightChunk.take(leftChunkSize), f),
      Either.right(rightChunk.drop(leftChunkSize))
    );
}

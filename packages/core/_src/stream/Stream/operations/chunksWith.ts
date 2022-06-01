/**
 * Performs the specified stream transformation with the chunk structure of
 * the stream exposed.
 *
 * @tsplus fluent ets/Stream chunksWith
 */
export function chunksWith_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (stream: Stream<R, E, Chunk<A>>) => Stream<R1, E1, Chunk<A1>>,
  __tsplusTrace?: string
): Stream<R | R1, E | E1, A1> {
  return Stream.suspend(f(self.chunks()).unchunks())
}

/**
 * Performs the specified stream transformation with the chunk structure of
 * the stream exposed.
 *
 * @tsplus static ets/Stream/Aspects chunksWith
 */
export const chunksWith = Pipeable(chunksWith_)

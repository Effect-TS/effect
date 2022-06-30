/**
 * Transforms both input chunks and result of this sink using the provided
 * functions.
 *
 * @tsplus static effect/core/stream/Sink.Aspects dimapChunks
 * @tsplus pipeable effect/core/stream/Sink dimapChunks
 */
export function dimapChunks<In, In1, Z, Z1>(
  f: (input: Chunk<In1>) => Chunk<In>,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
) {
  return <R, E, L>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z1> => self.contramapChunks(f).map(g)
}

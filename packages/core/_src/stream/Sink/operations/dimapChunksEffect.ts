/**
 * Effectfully transforms both input chunks and result of this sink using the
 * provided functions. `f` and `g` must preserve chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Aspects dimapChunksEffect
 * @tsplus pipeable effect/core/stream/Sink dimapChunksEffect
 */
export function dimapChunksEffect<R2, E2, In, In1, Z, Z1>(
  f: (input: Chunk<In1>) => Effect<R2, E2, Chunk<In>>,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
) {
  return <R, E, L>(self: Sink<R, E, In, L, Z>): Sink<R | R2, E | E2, In1, L, Z1> => self.contramapChunksEffect(f).map(g)
}

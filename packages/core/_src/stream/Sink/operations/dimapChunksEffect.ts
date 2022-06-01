/**
 * Effectfully transforms both input chunks and result of this sink using the
 * provided functions. `f` and `g` must preserve chunking-invariance.
 *
 * @tsplus fluent ets/Sink dimapChunksEffect
 */
export function dimapChunksEffect_<R, E, R2, E2, In, In1, L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  f: (input: Chunk<In1>) => Effect<R2, E2, Chunk<In>>,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
): Sink<R | R2, E | E2, In1, L, Z1> {
  return self.contramapChunksEffect(f).map(g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the
 * provided functions. `f` and `g` must preserve chunking-invariance.
 *
 * @tsplus static ets/Sink/Aspects dimapChunksEffect
 */
export const dimapChunksEffect = Pipeable(dimapChunksEffect_)

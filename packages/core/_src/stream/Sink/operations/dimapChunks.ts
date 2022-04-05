/**
 * Transforms both input chunks and result of this sink using the provided
 * functions.
 *
 * @tsplus fluent ets/Sink dimapChunks
 */
export function dimapChunks_<R, E, In, In1, L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  f: (input: Chunk<In1>) => Chunk<In>,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z1> {
  return self.contramapChunks(f).map(g);
}

/**
 * Transforms both input chunks and result of this sink using the provided
 * functions.
 *
 * @tsplus static ets/Sink/Aspects dimapChunks
 */
export const dimapChunks = Pipeable(dimapChunks_);

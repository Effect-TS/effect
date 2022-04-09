/**
 * Transforms both inputs and result of this sink using the provided
 * functions.
 *
 * @tsplus fluent ets/Sink dimap
 */
export function dimap_<R, E, In, In1, L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  f: (input: In1) => In,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z1> {
  return self.contramap(f).map(g);
}

/**
 * Transforms both inputs and result of this sink using the provided
 * functions.
 *
 * @tsplus static ets/Sink/Aspects dimap
 */
export const dimap = Pipeable(dimap_);

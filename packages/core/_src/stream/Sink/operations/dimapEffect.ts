/**
 * Effectfully transforms both inputs and result of this sink using the
 * provided functions.
 *
 * @tsplus fluent ets/Sink dimapEffect
 */
export function dimapEffect_<R, E, R2, E2, In, In1, L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  f: (input: In1) => Effect<R2, E2, In>,
  g: (z: Z) => Z1,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In1, L, Z1> {
  return self.contramapEffect(f).map(g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the
 * provided functions.
 *
 * @tsplus static ets/Sink/Aspects dimapEffect
 */
export const dimapEffect = Pipeable(dimapEffect_)

/**
 * Effectfully transforms both inputs and result of this sink using the
 * provided functions.
 *
 * @tsplus static effect/core/stream/Sink.Aspects dimapEffect
 * @tsplus pipeable effect/core/stream/Sink dimapEffect
 */
export function dimapEffect<R2, E2, In, In1, Z, Z1>(
  f: (input: In1) => Effect<R2, E2, In>,
  g: (z: Z) => Z1
) {
  return <R, E, L>(self: Sink<R, E, In, L, Z>): Sink<R | R2, E | E2, In1, L, Z1> =>
    self.contramapEffect(f).map(g)
}

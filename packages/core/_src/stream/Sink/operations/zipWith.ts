/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results with `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects zipWith
 * @tsplus pipeable effect/core/stream/Sink zipWith
 */
export function zipWith<R1, E1, In, In1 extends In, L, L1 extends L, Z, Z1, Z2>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L1, Z2> =>
    self.flatMap((z) => that().map((z1) => f(z, z1)))
}

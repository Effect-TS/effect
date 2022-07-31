/**
 * @tsplus static effect/core/stream/Sink.Aspects zip
 * @tsplus pipeable effect/core/stream/Sink zip
 */
export function zip<R1, E1, In, In1 extends In, L, L1 extends L, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>
) {
  return <R, E, Z>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In & In1, L1, Tuple<[Z, Z1]>> =>
    self.zipWith(that, (z, z1) => Tuple(z, z1))
}

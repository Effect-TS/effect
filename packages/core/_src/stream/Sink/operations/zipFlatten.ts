import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * @tsplus static effect/core/stream/Sink.Aspects zipFlatten
 * @tsplus pipeable effect/core/stream/Sink zipFlatten
 */
export function zipFlatten<R1, E1, In, In1 extends In, L, L1 extends L, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>
) {
  return <R, E, Z>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In & In1, L1, MergeTuple<Z, Z1>> =>
    self.zipWith(that, (z, z1) => Tuple.mergeTuple(z, z1))
}

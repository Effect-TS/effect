/**
 * @tsplus static effect/core/stream/Sink.Aspects zipFlatten
 * @tsplus pipeable effect/core/stream/Sink zipFlatten
 * @category zipping
 * @since 1.0.0
 */
export function zipFlatten<R1, E1, In, In1 extends In, L, L1 extends L, Z1>(
  that: Sink<R1, E1, In1, L1, Z1>
) {
  return <R, E, Z extends ReadonlyArray<any>>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In & In1, L1, readonly [...Z, Z1]> =>
    self.zipWith(that, (z, z1) => [...z, z1])
}

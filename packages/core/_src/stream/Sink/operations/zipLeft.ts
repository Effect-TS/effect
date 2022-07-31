/**
 * Like `zip`, but keeps only the result from the this sink.
 *
 * @tsplus pipeable-operator effect/core/stream/Sink <
 * @tsplus static effect/core/stream/Sink.Aspects zipLeft
 * @tsplus pipeable effect/core/stream/Sink zipLeft
 */
export function zipLeft<R1, E1, In, In1 extends In, L, L1 extends L, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>
) {
  return <R, E, Z>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L1, Z> =>
    self.zipWith(
      that,
      (z, _) => z
    )
}

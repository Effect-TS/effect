/**
 * Runs both sinks in parallel on the input and combines the results in a
 * tuple.
 *
 * @tsplus static effect/core/stream/Sink.Aspects zipPar
 * @tsplus pipeable effect/core/stream/Sink zipPar
 * @category zipping
 * @since 1.0.0
 */
export function zipPar<R1, E1, In1, L1, Z1>(
  that: Sink<R1, E1, In1, L1, Z1>
) {
  return <R, E, In, L, Z>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In & In1, L | L1, readonly [Z, Z1]> =>
    self.zipWithPar(that, (z, z1) => [z, z1] as const)
}

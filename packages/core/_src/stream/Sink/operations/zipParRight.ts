/**
 * Like `zipPar`, but keeps only the result from that sink.
 *
 * @tsplus static effect/core/stream/Sink.Aspects zipParRight
 * @tsplus pipeable effect/core/stream/Sink zipParRight
 */
export function zipParRight<R1, E1, In1, L1, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>
) {
  return <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L | L1, Z1> =>
    self.zipWithPar(that, (_, z1) => z1)
}

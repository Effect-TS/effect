/**
 * Like `zipPar`, but keeps only the result from this sink.
 *
 * @tsplus static effect/core/stream/Sink.Aspects zipParLeft
 * @tsplus pipeable effect/core/stream/Sink zipParLeft
 */
export function zipParLeft<R1, E1, In1, L1, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>
) {
  return <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L | L1, Z> =>
    self.zipWithPar(that, (z, _) => z)
}

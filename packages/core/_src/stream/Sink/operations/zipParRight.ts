/**
 * Like `zipPar`, but keeps only the result from that sink.
 *
 * @tsplus fluent ets/Sink zipParRight
 */
export function zipParRight_<R, R1, E, E1, In, In1, L, L1, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R | R1, E | E1, In & In1, L | L1, Z1> {
  return self.zipWithPar(that, (_, z1) => z1)
}

/**
 * Like `zipPar`, but keeps only the result from that sink.
 *
 * @tsplus static ets/Sink/Aspects zipParRight
 */
export const zipParRight = Pipeable(zipParRight_)

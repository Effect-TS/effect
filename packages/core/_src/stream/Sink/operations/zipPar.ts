/**
 * Runs both sinks in parallel on the input and combines the results in a
 * tuple.
 *
 * @tsplus fluent ets/Sink zipPar
 */
export function zipPar_<R, R1, E, E1, In, In1, L, L1, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L | L1, Tuple<[Z, Z1]>> {
  return self.zipWithPar(that, (z, z1) => Tuple(z, z1));
}

/**
 * Runs both sinks in parallel on the input and combines the results in a
 * tuple.
 *
 * @tsplus static ets/Sink/Aspects zipPar
 */
export const zipPar = Pipeable(zipPar_);

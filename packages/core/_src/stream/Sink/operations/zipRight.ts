/**
 * Like `zip`, but keeps only the result from the that sink.
 *
 * @tsplus operator ets/Sink >
 * @tsplus fluent ets/Sink zipRight
 */
export function zipRight_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R | R1, E | E1, In & In1, L1, Z1> {
  return self.zipWith(that, (_, z1) => z1)
}

/**
 * Like `zip`, but keeps only the result from the that sink.
 *
 * @tsplus static ets/Sink/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_)

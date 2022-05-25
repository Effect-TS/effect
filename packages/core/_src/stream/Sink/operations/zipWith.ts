/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results with `f`.
 *
 * @tsplus fluent ets/Sink zipWith
 */
export function zipWith_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1, Z2>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  f: (z: Z, z1: Z1) => Z2,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L1, Z2> {
  return self.flatMap((z) => that().map((z1) => f(z, z1)))
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results with `f`.
 *
 * @tsplus static ets/Sink/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_)

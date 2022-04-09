/**
 * @tsplus fluent ets/Sink zip
 */
export function zip_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L1, Tuple<[Z, Z1]>> {
  return self.zipWith(that, (z, z1) => Tuple(z, z1));
}

/**
 * @tsplus static ets/Sink/Aspects zip
 */
export const zip = Pipeable(zip_);

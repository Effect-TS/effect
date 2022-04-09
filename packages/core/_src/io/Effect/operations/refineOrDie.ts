/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus fluent ets/Effect refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => Option<E1>,
  __tsplusTrace?: string
) {
  return self.refineOrDieWith(pf, identity);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus static ets/Effect/Aspects refineOrDie
 */
export const refineOrDie = Pipeable(refineOrDie_);

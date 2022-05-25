/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus fluent ets/STM refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: STM<R, E, A>,
  pf: (e: E) => Option<E1>
) {
  return self.refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus static ets/STM/Aspects refineOrDie
 */
export const refineOrDie = Pipeable(refineOrDie_)

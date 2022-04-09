/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @tsplus fluent ets/Stream refineOrDie
 */
export function refineOrDie_<R, E, E2, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => Option<E2>,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  return self.refineOrDieWith(pf, identity);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @tsplus static ets/Stream/Aspects refineOrDie
 */
export const refineOrDie = Pipeable(refineOrDie_);

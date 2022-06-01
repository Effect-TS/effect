/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus fluent ets/TArray reduceOptionSTM
 */
export function reduceOptionSTM_<E, A>(
  self: TArray<A>,
  f: (x: A, y: A) => STM<never, E, A>
): STM<never, E, Option<A>> {
  return self.reduceSTM(Option.emptyOf<A>(), (acc, a) => acc.fold(STM.some(a), (acc) => f(acc, a).map(Option.some)))
}

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus static ets/TArray/Aspects reduceOptionSTM
 */
export const reduceOptionSTM = Pipeable(reduceOptionSTM_)

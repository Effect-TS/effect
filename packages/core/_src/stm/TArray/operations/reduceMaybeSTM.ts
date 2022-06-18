/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus fluent ets/TArray reduceMaybeSTM
 */
export function reduceMaybeSTM_<E, A>(
  self: TArray<A>,
  f: (x: A, y: A) => STM<never, E, A>
): STM<never, E, Maybe<A>> {
  return self.reduceSTM(Maybe.emptyOf<A>(), (acc, a) => acc.fold(STM.some(a), (acc) => f(acc, a).map(Maybe.some)))
}

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus static ets/TArray/Aspects reduceMaybeSTM
 */
export const reduceMaybeSTM = Pipeable(reduceMaybeSTM_)

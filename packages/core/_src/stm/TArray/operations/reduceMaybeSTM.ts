/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduceMaybeSTM
 * @tsplus pipeable effect/core/stm/TArray reduceMaybeSTM
 */
export function reduceMaybeSTM<E, A>(f: (x: A, y: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, Maybe<A>> =>
    self.reduceSTM(
      Maybe.emptyOf<A>(),
      (acc, a) => acc.fold(STM.some(a), (acc) => f(acc, a).map(Maybe.some))
    )
}

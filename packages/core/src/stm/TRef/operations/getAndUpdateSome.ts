/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects getAndUpdateSome
 * @tsplus pipeable effect/core/stm/TRef getAndUpdateSome
 */
export function getAndUpdateSome<A>(pf: (a: A) => Maybe<A>) {
  return (self: TRef<A>): STM<never, never, A> => self.getAndUpdate((a) => pf(a).getOrElse(a))
}

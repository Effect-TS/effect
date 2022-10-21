/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus static effect/core/stm/TRef.Aspects updateSome
 * @tsplus pipeable effect/core/stm/TRef updateSome
 */
export function updateSome<A>(pf: (a: A) => Maybe<A>) {
  return (self: TRef<A>): STM<never, never, void> => self.update((a) => pf(a).getOrElse(a))
}

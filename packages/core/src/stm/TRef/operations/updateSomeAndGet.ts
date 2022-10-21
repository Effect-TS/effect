/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus static effect/core/stm/TRef.Aspects updateSomeAndGet
 * @tsplus pipeable effect/core/stm/TRef updateSomeAndGet
 */
export function updateSomeAndGet<A>(pf: (a: A) => Maybe<A>) {
  return (self: TRef<A>): STM<never, never, A> => self.updateAndGet((a) => pf(a).getOrElse(a))
}

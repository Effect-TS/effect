/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects modifySome
 * @tsplus pipeable effect/core/stm/TRef modifySome
 */
export function modifySome<A, B>(def: B, pf: (a: A) => Maybe<Tuple<[B, A]>>) {
  return (self: TRef<A>): STM<never, never, B> => self.modify((a) => pf(a).getOrElse(Tuple(def, a)))
}

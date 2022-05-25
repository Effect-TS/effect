/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/TRef modifySome
 */
export function modifySome_<A, B>(
  self: TRef<A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>
): USTM<B> {
  return self.modify((a) => pf(a).getOrElse(Tuple(def, a)))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus static ets/TRef/Aspects modifySome
 */
export const modifySome = Pipeable(modifySome_)

/**
 * Atomically modifies the `Ref` with the specified partial function, which
 * computes a return value for the modification if the function is defined
 * on the current value otherwise it returns a default value. This is a more
 * powerful version of `updateSome`.
 *
 * @tsplus fluent ets/Ref modifySome
 */
export function modifySome_<A, B>(
  self: Ref<A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect.UIO<B> {
  return self.modify((v) => pf(v).getOrElse(Tuple(def, v)))
}

/**
 * Atomically modifies the `Ref` with the specified partial function, which
 * computes a return value for the modification if the function is defined
 * on the current value otherwise it returns a default value. This is a more
 * powerful version of `updateSome`.
 *
 * @tsplus static ets/Ref/Aspects modifySome
 */
export const modifySome = Pipeable(modifySome_)

/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent ets/FiberRef modifySome
 */
export function modifySome_<A, B, P>(
  self: FiberRef<A, P>,
  def: B,
  f: (a: A) => Maybe<Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect.UIO<B> {
  return self.modify((v) => f(v).getOrElse(Tuple(def, v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus static ets/FiberRef/Aspects modifySome
 */
export const modifySome = Pipeable(modifySome_)

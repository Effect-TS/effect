/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent effect/core/io/FiberRef modifySome
 */
export function modifySome_<A, B, P>(
  self: FiberRef<A, P>,
  def: B,
  f: (a: A) => Maybe<Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect<never, never, B> {
  return self.modify((v) => f(v).getOrElse(Tuple(def, v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects modifySome
 */
export const modifySome = Pipeable(modifySome_)

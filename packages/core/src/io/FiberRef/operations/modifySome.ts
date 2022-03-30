import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent ets/FiberRef modifySome
 */
export function modifySome_<A, B>(
  self: FiberRef<A>,
  def: B,
  f: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
): UIO<B> {
  return self.modify((v) => f(v).getOrElse(Tuple(def, v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export const modifySome = Pipeable(modifySome_)

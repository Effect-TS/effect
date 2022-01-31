import { constVoid } from "../../../data/Function"
import type { Managed } from "../definition"

/**
 * Return unit while running the effect.
 *
 * @tsplus fluent ets/Managed asUnit
 */
export function asUnit<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, void> {
  return self.map(constVoid)
}

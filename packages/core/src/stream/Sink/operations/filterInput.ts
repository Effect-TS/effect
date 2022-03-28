import type { Predicate, Refinement } from "../../../data/Function"
import type { Sink } from "../definition"

/**
 * Filter the input of this sink using the specified predicate.
 *
 * @tsplus fluent ets/Sink filterInput
 */
export function filterInput_<R, E, In, In1 extends In, In2 extends In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  p: Refinement<In1, In2>,
  __tsplusTrace?: string
): Sink<R, E, In2, L, Z>
export function filterInput_<R, E, In, In1 extends In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  p: Predicate<In1>,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z>
export function filterInput_<R, E, In, In1 extends In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  p: Predicate<In1>,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z> {
  return self.contramapChunks((chunk) => chunk.filter(p))
}

/**
 * Filter the input of this sink using the specified predicate.
 */
export const filterInput = Pipeable(filterInput_)

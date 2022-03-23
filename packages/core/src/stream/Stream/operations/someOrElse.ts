import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Stream } from "../definition"

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @tsplus getter ets/Effect someOrElse
 */
export function someOrElse_<R, E, A, A2>(
  self: Stream<R, E, Option<A>>,
  def: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  return self.map((option) => option.getOrElse(def))
}

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export const someOrElse = Pipeable(someOrElse_)

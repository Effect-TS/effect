import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Stream } from "../../Stream"

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @tsplus fluent ets/Stream refineOrDie
 */
export function refineOrDie_<R, E, E2, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => Option<E2>,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  return self.refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export const refineOrDie = Pipeable(refineOrDie_)

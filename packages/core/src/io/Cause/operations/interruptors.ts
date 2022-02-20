import * as HS from "../../../collection/immutable/HashSet"
import { Option } from "../../../data/Option/core"
import type { FiberId } from "../../FiberId/definition"
import type { Cause } from "../definition"

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 *
 * @tsplus fluent ets/Cause interruptors
 */
export function interruptors<E>(self: Cause<E>): HS.HashSet<FiberId> {
  return self.foldLeft(HS.make<FiberId>(), (acc, curr) =>
    curr.isInterruptType() ? Option.some(HS.add_(acc, curr.fiberId)) : Option.some(acc)
  )
}

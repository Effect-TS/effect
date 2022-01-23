import type { Cause } from "../definition"
import { Both, Die, empty, Interrupt, Stackless, Then } from "../definition"
import { fold_ } from "./fold"

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(self: Cause<E>): Cause<never> {
  return fold_(
    self,
    () => empty,
    () => empty,
    (defect, trace) => new Die(defect, trace),
    (fiberId, trace) => new Interrupt(fiberId, trace),
    (left, right) => new Then(left, right),
    (left, right) => new Both(left, right),
    (cause, stackless) => new Stackless(cause, stackless)
  )
}

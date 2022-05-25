import { Both, Cause, Die, Interrupt, Stackless, Then } from "@effect/core/io/Cause/definition"

/**
 * Discards all typed failures kept on this `Cause`.
 *
 * @tsplus fluent ets/Cause stripFailures
 */
export function stripFailures<E>(self: Cause<E>): Cause<never> {
  return self.fold(
    Cause.empty,
    () => Cause.empty,
    (defect, trace) => new Die(defect, trace),
    (fiberId, trace) => new Interrupt(fiberId, trace),
    (left, right) => new Then(left, right),
    (left, right) => new Both(left, right),
    (cause, stackless) => new Stackless(cause, stackless)
  )
}

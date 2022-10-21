import { Both, Cause, Die, Interrupt, Stackless, Then } from "@effect/core/io/Cause/definition"

/**
 * Discards all typed failures kept on this `Cause`.
 *
 * @tsplus getter effect/core/io/Cause stripFailures
 */
export function stripFailures<E>(self: Cause<E>): Cause<never> {
  return self.fold(
    Cause.empty,
    () => Cause.empty,
    (defect) => new Die(defect),
    (fiberId) => new Interrupt(fiberId),
    (left, right) => new Then(left, right),
    (left, right) => new Both(left, right),
    (cause, stackless) => new Stackless(cause, stackless)
  )
}

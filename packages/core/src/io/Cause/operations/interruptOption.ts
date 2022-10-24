import * as Option from "@fp-ts/data/Option"

/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
 * if one exists.
 *
 * @tsplus getter effect/core/io/Cause interruptOption
 * @category destructors
 * @since 1.0.0
 */
export function interruptOption<E>(self: Cause<E>): Option.Option<FiberId> {
  return self.find((cause) => cause.isInterruptType() ? Option.some(cause.fiberId) : Option.none)
}

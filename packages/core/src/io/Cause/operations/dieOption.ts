import * as Option from "@fp-ts/data/Option"

/**
 * Returns the value associated with the first `Die` in this `Cause` if
 * one exists.
 *
 * @tsplus getter effect/core/io/Cause dieOption
 * @category destructors
 * @since 1.0.0
 */
export function dieOption<E>(self: Cause<E>): Option.Option<unknown> {
  return self.find((cause) => cause.isDieType() ? Option.some(cause.value) : Option.none)
}

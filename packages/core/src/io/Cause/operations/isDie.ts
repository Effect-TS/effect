import * as Option from "@fp-ts/data/Option"

/**
 * Determines if the `Cause` contains a die.
 *
 * @tsplus getter effect/core/io/Cause isDie
 * @category destructors
 * @since 1.0.0
 */
export function isDie<E>(self: Cause<E>): boolean {
  return Option.isSome(self.dieOption)
}

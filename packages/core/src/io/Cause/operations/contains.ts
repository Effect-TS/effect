import * as Equal from "@fp-ts/data/Equal"
import * as Option from "@fp-ts/data/Option"

/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @tsplus static effect/core/io/Cause.Aspects contains
 * @tsplus pipeable effect/core/io/Cause contains
 * @category destructors
 * @since 1.0.0
 */
export function contains<E1>(that: Cause<E1>) {
  return <E>(self: Cause<E>): boolean => {
    if ((self as Cause<E | E1>) === that) {
      return true
    }
    return self.reduce<E, boolean>(
      false,
      (acc, cause) => Option.some(acc || Equal.equals(cause, that))
    )
  }
}

import type { Cause } from "../definition"

/**
 * Determines if the `Cause` contains a die.
 *
 * @ets fluent ets/Cause isDie
 */
export function isDie<E>(self: Cause<E>): boolean {
  return self.dieOption().isSome()
}

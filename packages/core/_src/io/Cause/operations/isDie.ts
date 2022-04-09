/**
 * Determines if the `Cause` contains a die.
 *
 * @tsplus fluent ets/Cause isDie
 */
export function isDie<E>(self: Cause<E>): boolean {
  return self.dieOption().isSome();
}

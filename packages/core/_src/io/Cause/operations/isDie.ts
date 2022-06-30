/**
 * Determines if the `Cause` contains a die.
 *
 * @tsplus getter effect/core/io/Cause isDie
 */
export function isDie<E>(self: Cause<E>): boolean {
  return self.dieMaybe.isSome()
}

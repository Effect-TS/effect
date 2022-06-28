/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @tsplus static effect/core/io/Cause.Aspects contains
 * @tsplus pipeable effect/core/io/Cause contains
 */
export function contains<E1>(that: Cause<E1>) {
  return <E>(self: Cause<E>): boolean => {
    if ((self as Cause<E | E1>) === that) {
      return true
    }
    return self.foldLeft<E, boolean>(false, (acc, cause) => Maybe.some(acc || Equals.equals(cause, that)))
  }
}

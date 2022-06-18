/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @tsplus fluent ets/Cause contains
 */
export function contains_<E, E1>(self: Cause<E>, that: Cause<E1>): boolean {
  if ((self as Cause<E | E1>) === that) {
    return true
  }
  return self.foldLeft<E, boolean>(false, (acc, cause) => Maybe.some(acc || Equals.equals(cause, that)))
}

/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @tsplus static ets/Cause/Aspects contains
 */
export const contains = Pipeable(contains_)

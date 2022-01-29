import { Option } from "../../../data/Option/core"
import * as St from "../../../prelude/Structural"
import type { Cause } from "../definition"

/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @ets fluent ets/Cause contains
 */
export function contains_<E, E1>(self: Cause<E>, that: Cause<E1>): boolean {
  if ((self as Cause<E | E1>) === that) {
    return true
  }
  return self.foldLeft<E, boolean>(false, (acc, cause) =>
    Option.some(acc || St.equals(cause, that))
  )
}

/**
 * Determines if this cause contains or is equal to the specified cause.
 *
 * @ets_data_first contains_
 */
export function contains<E1>(that: Cause<E1>) {
  return <E>(self: Cause<E>): boolean => contains_(self, that)
}

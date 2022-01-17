import * as O from "../../Option/core"
import * as St from "../../Structural"
import type { Cause } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains_<E, E1>(self: Cause<E>, that: Cause<E1>): boolean {
  if ((self as Cause<E | E1>) === that) {
    return true
  }
  return reduceLeft_<E, boolean>(self, false, (acc, cause) =>
    O.some(acc || St.equals(cause, that))
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

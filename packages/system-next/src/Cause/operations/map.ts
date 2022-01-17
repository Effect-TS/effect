// ets_tracing: off

import { none } from "../../Trace/operations/none"
import type { Cause } from "../definition"
import { Fail } from "../definition"
import { chain_ } from "./chain"

/**
 * Transforms the error type of this cause with the specified function.
 */
export function map_<E, E1>(self: Cause<E>, f: (e: E) => E1): Cause<E1> {
  return chain_(self, (e) => new Fail(f(e), none))
}

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @ets_data_first map_
 */
export function map<E, E1>(f: (e: E) => E1) {
  return (self: Cause<E>): Cause<E1> => map_(self, f)
}

import { Trace } from "../../../io/Trace"
import type { Cause } from "../definition"
import { Fail } from "../definition"

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @tsplus fluent ets/Cause map
 */
export function map_<E, E1>(self: Cause<E>, f: (e: E) => E1): Cause<E1> {
  return self.flatMap((e) => new Fail(f(e), Trace.none))
}

/**
 * Transforms the error type of this cause with the specified function.
 *
 * @ets_data_first map_
 */
export function map<E, E1>(f: (e: E) => E1) {
  return (self: Cause<E>): Cause<E1> => self.map(f)
}

import type { Cause } from "../definition"

/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @ets fluent ets/Cause as
 */
export function as_<E, E1>(self: Cause<E>, error: E1): Cause<E1> {
  return self.map(() => error)
}

/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<E1>(error: E1) {
  return <E>(self: Cause<E>): Cause<E1> => as_(self, error)
}

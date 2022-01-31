import type { Exit } from "../definition"

/**
 * Replaces the success value with the one provided.
 *
 * @tsplus fluent ets/Exit as
 */
export function as_<E, A, A1>(self: Exit<E, A>, value: A1): Exit<E, A1> {
  return self.map(() => value)
}

/**
 * Replaces the success value with the one provided.
 *
 * @ets_data_first as_
 */
export function as<A>(value: A) {
  return <E, A1>(self: Exit<E, A1>): Exit<E, A> => self.as(value)
}

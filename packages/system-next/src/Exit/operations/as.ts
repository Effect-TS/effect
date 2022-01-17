import type { Exit } from "../definition"
import { map_ } from "./map"

/**
 * Replaces the success value with the one provided.
 */
export function as_<E, A, A1>(self: Exit<E, A>, value: A1): Exit<E, A1> {
  return map_(self, () => value)
}

/**
 * Replaces the success value with the one provided.
 *
 * @ets_data_first as_
 */
export function as<A>(value: A) {
  return <E, A1>(self: Exit<E, A1>): Exit<E, A> => as_(self, value)
}

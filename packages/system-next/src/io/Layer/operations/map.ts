import type { Layer } from "../definition"
import { chain_ } from "./chain"
import { succeed } from "./succeed"

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export function map_<R, E, A, B>(self: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return chain_(self, (a) => succeed(f(a)))
}

/**
 * Returns a new layer whose output is mapped by the specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Layer<R, E, A>): Layer<R, E, B> => map_(self, f)
}

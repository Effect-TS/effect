// ets_tracing: off

import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(_: Effect<R, E, A>, f: (a: A) => B, __trace?: string) {
  return chain_(_, (a: A) => succeed(f(a)), __trace)
}

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>) => map_(self, f)
}

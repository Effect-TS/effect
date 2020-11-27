import { traceAs } from "../Function"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(_: Effect<R, E, A>, f: (a: A) => B) {
  // tracing: off
  return chain_(
    _,
    traceAs(f, (a: A) => succeed(f(a)))
  )
  // tracing: on
}

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Effect<R, E, A>) => map_(self, f)
}

import { traceAs } from "../Tracing"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(_: Effect<R, E, A>, f: (a: A) => B) {
  return chain_(
    _,
    traceAs(f)((a: A) => succeed(f(a)))
  )
}

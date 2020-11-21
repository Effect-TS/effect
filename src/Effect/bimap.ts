import { traceAs } from "../Tracing"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.

 * @module Effect
 * @trace 0
 * @trace 1
 */
export function bimap<E, A, E2, B>(f: (e: E) => E2, g: (a: A) => B) {
  return <R>(self: Effect<R, E, A>) => bimap_(self, f, g)
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 * @module Effect
 * @trace 1
 * @trace 2
 */
export function bimap_<R, E, A, E2, B>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B
) {
  return foldM_(
    self,
    traceAs((e) => fail(f(e)), f),
    traceAs((a) => succeed(g(a)), f)
  )
}

// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, A, E2, B>(f: (e: E) => E2, g: (a: A) => B, __trace?: string) {
  return <R>(self: Effect<R, E, A>) => bimap_(self, f, g, __trace)
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E2, B>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B,
  __trace?: string
) {
  return foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeed(g(a)),
    __trace
  )
}

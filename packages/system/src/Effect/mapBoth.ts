// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function mapBoth_<R, E, E1, A, B>(
  self: Effect<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => B,
  __trace?: string
): Effect<R, E1, B> {
  return foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeed(g(a)),
    __trace
  )
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets_data_first mapBoth_
 */
export function mapBoth<E, E1, A, B>(
  f: (e: E) => E1,
  g: (a: A) => B,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>) => mapBoth_(self, f, g, __trace)
}

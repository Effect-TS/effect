// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Recovers from all errors.
 */
export function catchAll_<R2, E2, A2, R, E, A>(
  effect: Effect<R2, E2, A2>,
  f: (e: E2) => Effect<R, E, A>,
  __trace?: string
) {
  return foldM_(effect, f, succeed, __trace)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<R, E, E2, A>(f: (e: E2) => Effect<R, E, A>, __trace?: string) {
  return <R2, A2>(effect: Effect<R2, E2, A2>) => catchAll_(effect, f, __trace)
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catch_
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    catchAll_(
      self,
      (e) => {
        if (tag in e && e[tag] === k) {
          return f(e as any)
        }
        return fail(e as any)
      },
      __trace
    )
}

/**
 * Recovers from specified error.
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>,
  __trace?: string
): Effect<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return catchAll_(
    self,
    (e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return fail(e as any)
    },
    __trace
  )
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catchTag_
 */
export function catchTag<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R1,
  E1,
  A1
>(k: K, f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>, __trace?: string) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> =>
    catchTag_(self, k, f, __trace)
}

/**
 * Recovers from specified error.
 */
export function catchTag_<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R,
  A,
  R1,
  E1,
  A1
>(
  self: Effect<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>,
  __trace?: string
): Effect<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catchAll_(
    self,
    (e) => {
      if ("_tag" in e && e["_tag"] === k) {
        return f(e as any)
      }
      return fail(e as any)
    },
    __trace
  )
}

export { _catch as catch }

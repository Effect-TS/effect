// ets_tracing: off

import type { Effect } from "../definition"
import { catchAll_ } from "./catchAll"

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

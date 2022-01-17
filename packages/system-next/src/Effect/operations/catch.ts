import type { Effect } from "../definition"
import { catchAll_ } from "./catchAll"

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

export { _catch as catch }

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

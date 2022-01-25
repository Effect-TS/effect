import type { Effect } from "../definition"
import { catchAll_ } from "./catchAll"

/**
 * Recovers from specified error.
 *
 * @ets fluent ets/Effect catchTag
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
  __etsTrace?: string
): Effect<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catchAll_(
    self,
    (e) => {
      if ("_tag" in e && e["_tag"] === k) {
        return f(e as any)
      }
      return fail(e as any)
    },
    __etsTrace
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
>(k: K, f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>, __etsTrace?: string) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> =>
    catchTag_(self, k, f, __etsTrace)
}

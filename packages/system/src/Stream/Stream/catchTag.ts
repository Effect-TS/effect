// ets_tracing: off

import * as CatchAll from "./catchAll.js"
import type { Stream } from "./definitions.js"
import * as Fail from "./fail.js"

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
>(k: K, f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>) {
  return <R, A>(
    self: Stream<R, E, A>
  ): Stream<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> => catchTag_(self, k, f)
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
  self: Stream<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
): Stream<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return CatchAll.catchAll_(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return Fail.fail(e as any)
  })
}

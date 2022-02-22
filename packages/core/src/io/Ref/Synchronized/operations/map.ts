import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { mapEffect_ } from "./mapEffect"

/**
 * Transforms the `get` value of the `XRef.Synchronized` with the specified
 * function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XSynchronized<RA, RB, EA, EB, A, C> {
  return mapEffect_(self, (b) => Effect.succeedNow(f(b)))
}

/**
 * Transforms the `get` value of the `XRef.Synchronized` with the specified
 * function.
 *
 * @ets_data_first map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, EB, A, C> => map_(self, f)
}

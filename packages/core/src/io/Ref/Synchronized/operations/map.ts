import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Transforms the `get` value of the `XRef.Synchronized` with the specified
 * function.
 *
 * @tsplus fluent ets/XSynchronized map
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XSynchronized<RA, RB, EA, EB, A, C> {
  return self.mapEffect((b) => Effect.succeedNow(f(b)))
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
  ): XSynchronized<RA, RB, EA, EB, A, C> => self.map(f)
}

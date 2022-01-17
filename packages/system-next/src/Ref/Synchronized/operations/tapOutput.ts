import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { mapEffect_ } from "./mapEffect"

/**
 * Performs the specified effect very time a value is read from this
 * `XRef.Synchronized`.
 */
export function tapOutput_<RA, RB, RC, EA, EB, EC, A, B, X>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, X>
): XSynchronized<RA, RB & RC, EA, EB | EC, A, B> {
  return mapEffect_(self, (a) => T.map_(f(a), () => a))
}

/**
 * Performs the specified effect very time a value is read from this
 * `XRef.Synchronized`.
 *
 * @ets_data_first tapOutput_
 */
export function tapOutput<B, RC, EC, X>(f: (b: B) => T.Effect<RC, EC, X>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, EB | EC, A, B> => tapOutput_(self, f)
}

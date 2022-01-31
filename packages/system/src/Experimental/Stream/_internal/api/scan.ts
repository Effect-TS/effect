// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as ScanEffect from "./scanEffect.js"

/**
 * Statefully maps over the elements of this stream to produce all intermediate results
 * of type `S` given an initial S.
 */
export function scan_<R, E, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): C.Stream<R, E, S> {
  return ScanEffect.scanEffect_(self, s, (s, a) => T.succeed(f(s, a)))
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results
 * of type `S` given an initial S.
 *
 * @ets_data_first scan_
 */
export function scan<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: C.Stream<R, E, A>) => scan_(self, s, f)
}

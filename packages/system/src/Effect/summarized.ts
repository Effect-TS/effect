// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { pipe } from "../Function/index.js"
import { suspend } from "./core.js"
import * as D from "./do.js"
import type { Effect } from "./effect.js"
import * as map from "./map.js"

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 */
export function summarized_<R, E, A, R2, E2, B, C>(
  self: Effect<R, E, A>,
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C,
  __trace?: string
): Effect<R & R2, E | E2, Tp.Tuple<[C, A]>> {
  return suspend(
    () =>
      pipe(
        D.do,
        D.bind("start", () => summary),
        D.bind("value", () => self),
        D.bind("end", () => summary),
        map.map((s) => Tp.tuple(f(s.start, s.end), s.value))
      ),
    __trace
  )
}

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @ets_data_first summarized_
 */
export function summarized<R2, E2, B, C>(
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Tp.Tuple<[C, A]>> =>
    summarized_(self, summary, f, __trace)
}

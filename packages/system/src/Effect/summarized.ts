import { pipe } from "../Function"
import * as D from "./do"
import type { Effect } from "./effect"
import { map } from "./map"

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 */
export function summarized_<R, E, A, R2, E2, B, C>(
  self: Effect<R, E, A>,
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C
): Effect<R & R2, E | E2, [C, A]> {
  return pipe(
    D.do,
    D.bind("start", () => summary),
    D.bind("value", () => self),
    D.bind("end", () => summary),
    map((s) => [f(s.start, s.end), s.value])
  )
}

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 */
export function summarized<R2, E2, B, C>(
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, [C, A]> =>
    summarized_(self, summary, f)
}

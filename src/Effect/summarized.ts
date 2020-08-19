import { pipe } from "../Function"

import * as D from "./do"
import { Effect } from "./effect"
import { map } from "./map"

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 */
export const summarized_ = <S, R, E, A, S2, R2, E2, B, C>(
  self: Effect<S, R, E, A>,
  summary: Effect<S2, R2, E2, B>,
  f: (start: B, end: B) => C
): Effect<S | S2, R & R2, E | E2, [C, A]> =>
  pipe(
    D.of,
    D.bind("start", () => summary),
    D.bind("value", () => self),
    D.bind("end", () => summary),
    map((s) => [f(s.start, s.end), s.value])
  )

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 */
export const summarized = <S2, R2, E2, B, C>(
  summary: Effect<S2, R2, E2, B>,
  f: (start: B, end: B) => C
) => <S, R, E, A>(self: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, [C, A]> =>
  summarized_(self, summary, f)

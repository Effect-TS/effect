import { Effect } from "./effect"
import { Do } from "./instances"

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
  Do()
    .bind("start", summary)
    .bind("value", self)
    .bind("end", summary)
    .return((s) => [f(s.start, s.end), s.value])

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

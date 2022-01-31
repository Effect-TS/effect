import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../definition"

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @tsplus fluent ets/Effect summarized
 */
export function summarized_<R, E, A, R2, E2, B, C>(
  self: Effect<R, E, A>,
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tuple<[C, A]>> {
  return Effect.suspendSucceed(() =>
    Effect.Do()
      .bind("start", () => summary)
      .bind("value", () => self)
      .bind("end", () => summary)
      .map(({ end, start, value }) => Tuple(f(start, end), value))
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
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Tuple<[C, A]>> =>
    summarized_(self, summary, f)
}

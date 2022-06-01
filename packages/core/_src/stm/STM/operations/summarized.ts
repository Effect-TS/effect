/**
 * Summarizes a `STM` effect by computing a provided value before and after
 * execution, and then combining the values to produce a summary, together
 * with the result of execution.
 *
 * @tsplus fluent ets/STM summarized
 */
export function summarized_<R, E, A, R2, E2, B, C>(
  self: STM<R, E, A>,
  summary: STM<R2, E2, B>,
  f: (start: B, end: B) => C
): STM<R | R2, E | E2, Tuple<[C, A]>> {
  return STM.Do()
    .bind("start", () => summary)
    .bind("value", () => self)
    .bind("end", () => summary)
    .map(({ end, start, value }) => Tuple(f(start, end), value))
}

/**
 * Summarizes a `STM` effect by computing a provided value before and after
 * execution, and then combining the values to produce a summary, together
 * with the result of execution.
 *
 * @tsplus static ets/STM/Aspects summarized
 */
export const summarized = Pipeable(summarized_)

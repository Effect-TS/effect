/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @tsplus fluent ets/Effect summarized
 */
export function summarized_<R, E, A, R2, E2, B, C>(
  self: Effect<R, E, A>,
  summary: LazyArg<Effect<R2, E2, B>>,
  f: (start: B, end: B) => C,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, Tuple<[C, A]>> {
  return Effect.succeed(summary).flatMap((summary) =>
    Effect.Do()
      .bind("start", () => summary)
      .bind("value", () => self)
      .bind("end", () => summary)
      .map(({ end, start, value }) => Tuple(f(start, end), value))
  );
}

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @tsplus static ets/Effect/Aspects summarized
 */
export const summarized = Pipeable(summarized_);

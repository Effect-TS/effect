/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @tsplus static effect/core/io/Effect.Aspects summarized
 * @tsplus pipeable effect/core/io/Effect summarized
 * @category mutations
 * @since 1.0.0
 */
export function summarized<R2, E2, B, C>(
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, readonly [C, A]> =>
    Do(($) => {
      const start = $(summary)
      const value = $(self)
      const end = $(summary)
      return [f(start, end), value] as const
    })
}

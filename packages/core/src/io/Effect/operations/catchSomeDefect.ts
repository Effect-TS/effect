import type { Option } from "@fp-ts/data/Option"

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSomeDefect
 * @tsplus pipeable effect/core/io/Effect catchSomeDefect
 * @category alternatives
 * @since 1.0.0
 */
export function catchSomeDefect<R2, E2, A2>(pf: (_: unknown) => Option<Effect<R2, E2, A2>>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self
      .unrefineWith(pf, Effect.fail)
      .catchAll((s): Effect<R2, E | E2, A2> => s)
}

import * as Option from "@fp-ts/data/Option"

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchAllDefect
 * @tsplus pipeable effect/core/io/Effect catchAllDefect
 * @category alternatives
 * @since 1.0.0
 */
export function catchAllDefect<R2, E2, A2>(f: (defect: unknown) => Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.catchSomeDefect((d) => Option.some(f(d)))
}

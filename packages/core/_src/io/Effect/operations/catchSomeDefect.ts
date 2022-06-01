/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus fluent ets/Effect catchSomeDefect
 */
export function catchSomeDefect_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  pf: (_: unknown) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A | A2> {
  return self
    .unrefineWith(pf, Effect.failNow)
    .catchAll((s): Effect<R2, E | E2, A2> => s)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus static ets/Effect/Aspects catchSomeDefect
 */
export const catchSomeDefect = Pipeable(catchSomeDefect_)

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus fluent ets/Effect catchAllDefect
 */
export function catchAllDefect_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (defect: unknown) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.catchSomeDefect((d) => Option.some(f(d)))
}

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @tsplus static ets/Effect/Aspects catchAllDefect
 */
export const catchAllDefect = Pipeable(catchAllDefect_)

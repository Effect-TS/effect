/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/Effect/Ops whenCaseEffect
 */
export function whenCaseEffect<R, E, A, R1, E1, B>(
  a: LazyArg<Effect<R, E, A>>,
  pf: (a: A) => Option<Effect<R1, E1, B>>,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, Option<B>> {
  return Effect.suspendSucceed(a().flatMap((a) => Effect.whenCase(a, pf)))
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/Effect unlessEffect
 */
export function unlessEffect_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  predicate: LazyArg<Effect<R2, E2, boolean>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, Option<A>> {
  return Effect.suspendSucceed(
    predicate().flatMap((b) => (b ? Effect.none : self.asSome()))
  )
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus static ets/Effect/Aspects unlessEffect
 */
export const unlessEffect = Pipeable(unlessEffect_)

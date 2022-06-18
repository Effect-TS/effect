/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus fluent ets/Effect unless
 */
export function unless_<R, E, A>(
  self: Effect<R, E, A>,
  predicate: LazyArg<boolean>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<A>> {
  return Effect.suspendSucceed(predicate() ? Effect.none : self.asSome())
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static ets/Effect/Aspects unless
 */
export const unless = Pipeable(unless_)

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/Effect/Ops whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Maybe<Effect<R, E, B>>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<B>> {
  return Effect.suspendSucceed(
    pf(a())
      .map((effect) => effect.asSome())
      .getOrElse(Effect.none)
  )
}

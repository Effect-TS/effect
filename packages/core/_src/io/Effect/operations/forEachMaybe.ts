/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Maybe<B>`.
 *
 * @tsplus static ets/Effect/Ops forEachMaybe
 */
export function forEachMaybe<R, E, A, B>(
  option: Maybe<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<B>> {
  return option.fold(Effect.none, (a) => f(a).map(Maybe.some))
}

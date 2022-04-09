/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<B>`.
 *
 * @tsplus static ets/Effect/Ops forEachOption
 */
export function forEachOption<R, E, A, B>(
  option: Option<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Option<B>> {
  return option.fold(Effect.none, (a) => f(a).map(Option.some));
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElseEffect
 */
export function someOrElseEffect_<R, E, A, R2, E2, B>(
  self: Effect<R, E, Option<A>>,
  orElse: LazyArg<Effect<R2, E2, B>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | B> {
  return (self as Effect<R, E, Option<A | B>>).flatMap((option) => option.map(Effect.succeedNow).getOrElse(orElse));
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static ets/Effect/Aspects someOrElseEffect
 */
export const someOrElseEffect = Pipeable(someOrElseEffect_);

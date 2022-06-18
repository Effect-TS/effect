/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @tsplus fluent ets/Effect tapSome
 */
export function tapSome_<R, E, A, R1, E1, X>(
  self: Effect<R, E, A>,
  pf: (a: A) => Maybe<Effect<R1, E1, X>>,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, A> {
  return self.tap((a) => pf(a).getOrElse(Effect.unit))
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @tsplus static ets/Effect/Aspects tapSome
 */
export const tapSome = Pipeable(tapSome_)

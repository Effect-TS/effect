/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapSome
 * @tsplus pipeable effect/core/io/Effect tapSome
 */
export function tapSome<A, R1, E1, X>(
  pf: (a: A) => Maybe<Effect<R1, E1, X>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A> => self.tap((a) => pf(a).getOrElse(Effect.unit))
}

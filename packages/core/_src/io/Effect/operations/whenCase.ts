/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static effect/core/io/Effect.Ops whenCase
 */
export function whenCase<R, E, A, B>(
  a: A,
  pf: (a: A) => Maybe<Effect<R, E, B>>
): Effect<R, E, Maybe<B>> {
  return pf(a).map((effect) => effect.asSome).getOrElse(Effect.none)
}

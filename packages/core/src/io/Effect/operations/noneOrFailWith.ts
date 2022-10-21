/**
 * Lifts an `Maybe` into a `IO`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with an error adapted with
 * the specified function.
 *
 * @tsplus static effect/core/io/Effect.Ops noneOrFailWith
 */
export function noneOrFailWith<E, A>(
  option: Maybe<A>,
  f: (a: A) => E
): Effect<never, E, void> {
  return Effect.getOrFailDiscard(option).flip.mapError(f)
}

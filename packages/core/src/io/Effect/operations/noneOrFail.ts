/**
 * Lifts an `Maybe` into a `IO`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with the content.
 *
 * @tsplus static effect/core/io/Effect.Ops noneOrFail
 */
export function noneOrFail<E>(option: Maybe<E>): Effect<never, E, void> {
  return Effect.getOrFailDiscard(option).flip
}

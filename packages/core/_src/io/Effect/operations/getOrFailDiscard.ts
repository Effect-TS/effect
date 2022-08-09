/**
 * Lifts an `Maybe` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFailDiscard
 */
export function getOrFailDiscard<A>(option: Maybe<A>): Effect<never, void, A> {
  return Effect.getOrFailWith(option, undefined)
}

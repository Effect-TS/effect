/**
 * Lifts an `Maybe` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFail
 */
export function getOrFail<A>(option: Maybe<A>): Effect<never, NoSuchElement, A> {
  return Effect.getOrFailWith(option, new NoSuchElement())
}

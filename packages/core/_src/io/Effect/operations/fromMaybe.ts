/**
 * Lifts an `Maybe` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static effect/core/io/Effect.Ops fromMaybe
 */
export function fromMaybe<A>(option: Maybe<A>): Effect<never, Maybe<never>, A> {
  return option.fold(Effect.fail(Maybe.none), Effect.succeed)
}

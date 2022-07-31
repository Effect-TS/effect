/**
 * Lifts an `Maybe` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static effect/core/io/Effect.Ops fromMaybe
 */
export function fromMaybe<A>(option: LazyArg<Maybe<A>>): Effect<never, Maybe<never>, A> {
  return Effect.sync(option).flatMap((option) =>
    option.fold(Effect.failSync(Maybe.none), Effect.succeed)
  )
}

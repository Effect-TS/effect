import * as Option from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static effect/core/io/Effect.Ops fromOption
 */
export function fromOption<A>(option: Option.Option<A>): Effect<never, Option.Option<never>, A> {
  switch (option._tag) {
    case "None": {
      return Effect.fail(Option.none)
    }
    case "Some": {
      return Effect.succeed(option.value)
    }
  }
}

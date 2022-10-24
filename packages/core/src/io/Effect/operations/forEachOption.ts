import * as Option from "@fp-ts/data/Option"

/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<B>`.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachOption
 * @category elements
 * @since 1.0.0
 */
export function forEachMaybe<R, E, A, B>(
  option: Option.Option<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Option.Option<B>> {
  switch (option._tag) {
    case "None": {
      return Effect.none
    }
    case "Some": {
      return f(option.value).map(Option.some)
    }
  }
}

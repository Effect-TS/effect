import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static effect/core/io/Effect.Aspect someOrElse
 * @tsplus pipeable effect/core/io/Effect someOrElse
 * @category getters
 * @since 1.0.0
 */
export function someOrElse<B>(orElse: LazyArg<B>) {
  return <R, E, A>(self: Effect<R, E, Option<A>>): Effect<R, E, A | B> =>
    self.map((option) => {
      switch (option._tag) {
        case "None": {
          return orElse()
        }
        case "Some": {
          return option.value
        }
      }
    })
}

import * as Option from "@fp-ts/data/Option"

/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter effect/core/io/Effect some
 * @category mutations
 * @since 1.0.0
 */
export function some<R, E, A>(
  self: Effect<R, E, Option.Option<A>>
): Effect<R, Option.Option<E>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return Effect.fail(Option.none)
        }
        case "Some": {
          return Effect.succeed(option.value)
        }
      }
    }
  )
}

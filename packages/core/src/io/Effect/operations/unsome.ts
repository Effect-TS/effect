import * as Option from "@fp-ts/data/Option"

/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter effect/core/io/Effect unsome
 * @category mutations
 * @since 1.0.0
 */
export function unsome<R, E, A>(
  self: Effect<R, Option.Option<E>, A>
): Effect<R, E, Option.Option<A>> {
  return self.foldEffect(
    (option) => {
      switch (option._tag) {
        case "None": {
          return Effect.succeed(Option.none)
        }
        case "Some": {
          return Effect.fail(option.value)
        }
      }
    },
    (a) => Effect.succeed(Option.some(a))
  )
}

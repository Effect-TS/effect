import * as Option from "@fp-ts/data/Option"

/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter effect/core/io/Effect none
 * @category constructors
 * @since 1.0.0
 */
export function none<R, E, A>(
  self: Effect<R, E, Option.Option<A>>
): Effect<R, Option.Option<E>, void> {
  return self.foldEffect(
    (e) => Effect.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return Effect.unit
        }
        case "Some": {
          return Effect.fail(Option.none)
        }
      }
    }
  )
}

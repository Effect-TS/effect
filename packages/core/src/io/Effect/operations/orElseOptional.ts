import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElseOptional
 * @tsplus pipeable effect/core/io/Effect orElseOptional
 * @category alternatives
 * @since 1.0.0
 */
export function orElseOptional<R, E, A, R2, E2, A2>(
  that: LazyArg<Effect<R2, Option.Option<E2>, A2>>
) {
  return (self: Effect<R, Option.Option<E>, A>): Effect<R | R2, Option.Option<E | E2>, A | A2> =>
    self.catchAll((option) => {
      switch (option._tag) {
        case "None": {
          return that()
        }
        case "Some": {
          return Effect.fail(Option.some<E | E2>(option.value))
        }
      }
    })
}

import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/io/Effect.Aspects someOrFail
 * @tsplus pipeable effect/core/io/Effect someOrFail
 * @category getters
 * @since 1.0.0
 */
export function someOrFail<E2>(orFail: LazyArg<E2>) {
  return <R, E, A>(self: Effect<R, E, Option<A>>): Effect<R, E | E2, A> =>
    self.flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return Effect.sync(orFail).flatMap(Effect.fail)
        }
        case "Some": {
          return Effect.succeed(option.value)
        }
      }
    })
}

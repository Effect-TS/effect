import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @tsplus static effect/core/stream/Stream.Aspects someOrElse
 * @tsplus pipeable effect/core/stream/Stream someOrElse
 * @category getters
 * @since 1.0.0
 */
export function someOrElse<A2>(def: LazyArg<A2>) {
  return <R, E, A>(self: Stream<R, E, Option<A>>): Stream<R, E, A | A2> =>
    self.map((option) => {
      switch (option._tag) {
        case "None": {
          return def()
        }
        case "Some": {
          return option.value
        }
      }
    })
}

import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/stream/Stream.Aspects someOrFail
 * @tsplus pipeable effect/core/stream/Stream someOrFail
 * @category getters
 * @since 1.0.0
 */
export function someOrFail<E2>(e: LazyArg<E2>) {
  return <R, E, A>(self: Stream<R, E, Option<A>>): Stream<R, E | E2, A> =>
    self.mapEffect((option) => {
      switch (option._tag) {
        case "None": {
          return Effect.failSync(e)
        }
        case "Some": {
          return Effect.succeed(option.value)
        }
      }
    })
}

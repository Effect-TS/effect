import * as Option from "@fp-ts/data/Option"

/**
 * Switches to the provided stream in case this one fails with the `None`
 * value.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects orElseOptional
 * @tsplus pipeable effect/core/stream/Stream orElseOptional
 * @category alternatives
 * @since 1.0.0
 */
export function orElseOptional<R2, E2, A2>(
  that: LazyArg<Stream<R2, Option.Option<E2>, A2>>
) {
  return <R, E, A>(
    self: Stream<R, Option.Option<E>, A>
  ): Stream<R | R2, Option.Option<E | E2>, A | A2> =>
    self.catchAll((option) => {
      switch (option._tag) {
        case "None": {
          return that()
        }
        case "Some": {
          return Stream.fail(Option.some<E | E2>(option.value))
        }
      }
    })
}

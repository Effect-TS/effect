import type * as Option from "@fp-ts/data/Option"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/io/Effect.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/io/Effect refineOrDieWith
 * @category mutations
 * @since 1.0.0
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option.Option<E1>,
  f: (e: E) => unknown
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1, A> =>
    self.catchAll((e) => {
      const option = pf(e)
      switch (option._tag) {
        case "None": {
          return Effect.die(f(e))
        }
        case "Some": {
          return Effect.fail(option.value)
        }
      }
    })
}

import type * as Option from "@fp-ts/data/Option"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus static effect/core/io/Effect.Aspects rejectEffect
 * @tsplus pipeable effect/core/io/Effect rejectEffect
 * @category mutations
 * @since 1.0.0
 */
export function rejectEffect<A, R1, E1>(pf: (a: A) => Option.Option<Effect<R1, E1, E1>>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A> =>
    self.flatMap((a) => {
      const option = pf(a)
      switch (option._tag) {
        case "None": {
          return Effect.succeed(a)
        }
        case "Some": {
          return option.value.flatMap(Effect.fail)
        }
      }
    })
}

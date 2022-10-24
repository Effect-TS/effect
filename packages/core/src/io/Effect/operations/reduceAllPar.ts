import * as Option from "@fp-ts/data/Option"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceAllPar
 * @category folding
 * @since 1.0.0
 */
export function reduceAllPar<R, E, A>(
  a: Effect<R, E, A>,
  as: Iterable<Effect<R, E, A>>,
  f: (acc: A, a: A) => A
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    Effect.mergeAllPar<R, E, A, Option.Option<A>>(
      [a, ...Array.from(as)],
      Option.none,
      (acc, elem) => {
        switch (acc._tag) {
          case "None": {
            return Option.some(elem)
          }
          case "Some": {
            return Option.some(f(acc.value, elem))
          }
        }
      }
    ).map((option) => {
      switch (option._tag) {
        case "None": {
          throw new Error("Bug")
        }
        case "Some": {
          return option.value
        }
      }
    })
  )
}

import type { Option } from "@fp-ts/data/Option"

/**
 * Maps the values produced by this generator with the specified partial
 * function, discarding any values the partial function is not defined at.
 *
 * @tsplus static effect/core/testing/Gen.Aspects collect
 * @tsplus pipeable effect/core/testing/Gen collect
 * @category mutations
 * @since 1.0.0
 */
export function collect<A, B>(pf: (a: A) => Option<B>) {
  return <R>(self: Gen<R, A>): Gen<R, B> =>
    self.flatMap(
      (a) => {
        const option = pf(a)
        switch (option._tag) {
          case "None": {
            return Gen.empty
          }
          case "Some": {
            return Gen.constant(option.value)
          }
        }
      }
    )
}

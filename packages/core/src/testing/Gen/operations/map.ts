import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Gen.Aspects map
 * @tsplus pipeable effect/core/testing/Gen map
 * @category mapping
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B) {
  return <R>(self: Gen<R, A>): Gen<R, B> =>
    Gen(self.sample.map(Option.map((sample) => sample.map(f))))
}

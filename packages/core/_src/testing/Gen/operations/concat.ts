/**
 * Concatenates the specified deterministic generator with this determinstic
 * generator, resulting in a deterministic generator that generates the values
 * from this generator and then the values from the specified generator.
 *
 * @tsplus pipeable-operator effect/core/testing/Gen +
 * @tsplus static effect/core/testing/Gen.Aspects concat
 * @tsplus pipeable effect/core/testing/Gen concat
 */
export function concat<R2, A2>(that: Gen<R2, A2>) {
  return <R, A>(self: Gen<R, A>): Gen<R | R2, A | A2> =>
    Gen<R | R2, A | A2>(
      self.sample.concat(that.sample)
    )
}

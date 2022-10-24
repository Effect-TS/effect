/**
 * Sets the size parameter for this generator to the specified value.
 *
 * @tsplus static effect/core/testing/Gen.Aspects resize
 * @tsplus pipeable effect/core/testing/Gen resize
 * @category mutations
 * @since 1.0.0
 */
export function resize(size: number) {
  return <R, A>(self: Gen<R, A>): Gen<R | Sized, A> => Sized.withSizeGen(size)(self)
}

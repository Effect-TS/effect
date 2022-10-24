/**
 * @tsplus static effect/core/testing/Gen.Ops size
 * @category constructors
 * @since 1.0.0
 */
export const size: Gen<Sized, number> = Gen.fromEffect(Sized.size)

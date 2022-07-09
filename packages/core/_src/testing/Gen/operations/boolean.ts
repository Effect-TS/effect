/**
 * A generator of booleans. Shrinks toward 'false'.
 *
 * @tsplus static effect/core/testing/Gen.Ops boolean
 */
export const boolean: Gen<never, boolean> = Gen.oneOf(
  Gen.constant(true),
  Gen.constant(false)
)

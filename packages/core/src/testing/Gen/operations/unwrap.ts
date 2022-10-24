/**
 * Unwraps a `Gen` from an `Effect` that results in a `Gen`.
 *
 * @tsplus static effect/core/testing/Gen.Ops unwrap
 * @category constructors
 * @since 1.0.0
 */
export function unwrap<R, R1, A>(effect: Effect<R, never, Gen<R1, A>>): Gen<R | R1, A> {
  return Gen.fromEffect(effect).flatten
}

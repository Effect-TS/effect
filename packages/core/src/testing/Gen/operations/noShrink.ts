/**
 * Discards the shrinker for this generator.
 *
 * @tsplus getter effect/core/testing/Gen noShrink
 * @category mutations
 * @since 1.0.0
 */
export function noShrink<R, A>(self: Gen<R, A>): Gen<R, A> {
  return self.reshrink(Sample.noShrink)
}

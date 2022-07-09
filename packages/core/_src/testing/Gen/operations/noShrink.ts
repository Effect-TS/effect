/**
 * Discards the shrinker for this generator.
 *
 * @tsplus getter effect/core/testing/Gen noShrink
 */
export function noShrink<R, A>(self: Gen<R, A>): Gen<R, A> {
  return self.reshrink(Sample.noShrink)
}

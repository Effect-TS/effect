/**
 * A sample without shrinking.
 *
 * @tsplus static effect/core/testing/Sample.Ops noShrink
 * @category constructors
 * @since 1.0.0
 */
export function noShrink<A>(a: A): Sample<never, A> {
  return Sample(a, Stream.empty)
}

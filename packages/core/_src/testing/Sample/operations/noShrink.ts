/**
 * A sample without shrinking.
 *
 * @tsplus static effect/core/testing/Sample.Ops noShrink
 */
export function noShrink<A>(a: A): Sample<never, A> {
  return Sample(a, Stream.empty)
}

/**
 * Filters this sample by replacing it with its shrink tree if the value does
 * not meet the specified predicate and recursively filtering the shrink tree.
 *
 * @tsplus static effect/core/testing/Sample.Aspects filter
 * @tsplus pipeable effect/core/testing/Sample filter
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R>(self: Sample<R, A>) => Stream<R, never, Maybe<Sample<R, B>>>
export function filter<A>(
  f: Predicate<A>
): <R>(self: Sample<R, A>) => Stream<R, never, Maybe<Sample<R, A>>>
export function filter<A>(f: Predicate<A>) {
  return <R>(self: Sample<R, A>): Stream<R, never, Maybe<Sample<R, A>>> =>
    f(self.value) ?
      Stream(
        Maybe.some(Sample(
          self.value,
          self.shrink.flatMap((maybe) =>
            maybe
              .map((sample) => sample.filter(f))
              .getOrElse(Stream.empty)
          )
        ))
      ) :
      self.shrink.flatMap((maybe) =>
        maybe
          .map((sample) => sample.filter(f))
          .getOrElse(Stream.empty)
      )
}

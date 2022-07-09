/**
 * Filters the values produced by this generator, discarding any values that
 * do not meet the specified predicate. Using `filter` can reduce test
 * performance, especially if many values must be discarded. It is recommended
 * to use combinators such as `map` and `flatMap` to create generators of the
 * desired values instead.
 *
 * @tsplus static effect/core/testing/Gen.Aspects filter
 * @tsplus pipeable effect/core/testing/Gen filter
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R>(self: Gen<R, A>) => Gen<R, B>
export function filter<A>(
  f: Predicate<A>
): <R>(self: Gen<R, A>) => Gen<R, A>
export function filter<A>(f: Predicate<A>) {
  return <R>(self: Gen<R, A>): Gen<R, A> =>
    self.flatMap((a) =>
      f(a) ?
        Gen.constant(a) :
        Gen.empty
    )
}

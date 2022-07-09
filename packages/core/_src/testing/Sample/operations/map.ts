/**
 * @tsplus static effect/core/testing/Sample.Aspects map
 * @tsplus pipeable effect/core/testing/Sample map
 */
export function map<A, A2>(f: (a: A) => A2) {
  return <R>(self: Sample<R, A>): Sample<R, A2> =>
    Sample(
      f(self.value),
      self.shrink.map((maybe) => maybe.map((sample) => sample.map(f)))
    )
}

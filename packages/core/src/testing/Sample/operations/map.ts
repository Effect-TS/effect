import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Sample.Aspects map
 * @tsplus pipeable effect/core/testing/Sample map
 * @category mapping
 * @since 1.0.0
 */
export function map<A, A2>(f: (a: A) => A2) {
  return <R>(self: Sample<R, A>): Sample<R, A2> =>
    Sample(
      f(self.value),
      self.shrink.map(Option.map((sample) => sample.map(f)))
    )
}

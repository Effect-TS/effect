import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Converts the shrink tree into a stream of shrinkings by recursively
 * searching the shrink tree, using the specified function to determine
 * whether a value is a failure. The resulting stream will contain all values
 * explored, regardless of whether they are successes or failures.
 *
 * @tsplus static effect/core/testing/Sample.Aspects shrinkSearch
 * @tsplus pipeable effect/core/testing/Sample shrinkSearch
 * @category mutations
 * @since 1.0.0
 */
export function shrinkSearch<A>(f: Predicate<A>) {
  return <R>(self: Sample<R, A>): Stream<R, never, A> =>
    f(self.value) ?
      Stream(self.value).concat(
        self.shrink.takeUntil((option) => {
          switch (option._tag) {
            case "None": {
              return false
            }
            case "Some": {
              return f(option.value.value)
            }
          }
        }).flatMap((option) => {
          switch (option._tag) {
            case "None": {
              return Stream.empty
            }
            case "Some": {
              return option.value.shrinkSearch(f)
            }
          }
        })
      ) :
      Stream(self.value)
}

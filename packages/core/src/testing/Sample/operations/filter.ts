import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Filters this sample by replacing it with its shrink tree if the value does
 * not meet the specified predicate and recursively filtering the shrink tree.
 *
 * @tsplus static effect/core/testing/Sample.Aspects filter
 * @tsplus pipeable effect/core/testing/Sample filter
 * @category filtering
 * @since 1.0.0
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R>(self: Sample<R, A>) => Stream<R, never, Option.Option<Sample<R, B>>>
export function filter<A>(
  f: Predicate<A>
): <R>(self: Sample<R, A>) => Stream<R, never, Option.Option<Sample<R, A>>>
export function filter<A>(f: Predicate<A>) {
  return <R>(self: Sample<R, A>): Stream<R, never, Option.Option<Sample<R, A>>> =>
    f(self.value) ?
      Stream(
        Option.some(Sample(
          self.value,
          self.shrink.flatMap((option) => {
            switch (option._tag) {
              case "None": {
                return Stream.empty
              }
              case "Some": {
                return option.value.filter(f)
              }
            }
          })
        ))
      ) :
      self.shrink.flatMap((option) => {
        switch (option._tag) {
          case "None": {
            return Stream.empty
          }
          case "Some": {
            return option.value.filter(f)
          }
        }
      })
}

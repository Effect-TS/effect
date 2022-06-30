/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus static effect/core/stm/TArray.Aspects minMaybe
 * @tsplus pipeable effect/core/stm/TArray minMaybe
 */
export function minMaybe<A>(ord: Ord<A>) {
  return (self: TArray<A>): STM<never, never, Maybe<A>> =>
    self.reduceMaybe(
      (acc, a) => (ord.lt(a, acc) ? a : acc)
    )
}

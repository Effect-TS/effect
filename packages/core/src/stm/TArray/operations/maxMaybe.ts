/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus static effect/core/stm/TArray.Aspects maxMaybe
 * @tsplus pipeable effect/core/stm/TArray maxMaybe
 */
export function maxMaybe_<A>(ord: Ord<A>) {
  return (self: TArray<A>): STM<never, never, Maybe<A>> =>
    self.reduceMaybe(
      (acc, a) => (ord.gt(a, acc) ? a : acc)
    )
}

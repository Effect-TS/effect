/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray minOption
 */
export function minOption_<A>(self: TArray<A>, ord: Ord<A>): USTM<Option<A>> {
  return self.reduceOption((acc, a) => (ord.lt(a, acc) ? a : acc));
}

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus static ets/TArray/Aspects minOption
 */
export const minOption = Pipeable(minOption_);

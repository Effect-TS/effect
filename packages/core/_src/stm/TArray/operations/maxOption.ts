/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray maxOption
 */
export function maxOption_<A>(self: TArray<A>, ord: Ord<A>): USTM<Option<A>> {
  return self.reduceOption((acc, a) => (ord.gt(a, acc) ? a : acc))
}

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus static ets/TArray/Aspects maxOption
 */
export const maxOption = Pipeable(maxOption_)

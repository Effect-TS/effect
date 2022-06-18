/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray minMaybe
 */
export function minMaybe_<A>(self: TArray<A>, ord: Ord<A>): USTM<Maybe<A>> {
  return self.reduceMaybe((acc, a) => (ord.lt(a, acc) ? a : acc))
}

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus static ets/TArray/Aspects minMaybe
 */
export const minMaybe = Pipeable(minMaybe_)

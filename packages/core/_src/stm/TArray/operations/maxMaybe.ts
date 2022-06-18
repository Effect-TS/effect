/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray maxMaybe
 */
export function maxMaybe_<A>(self: TArray<A>, ord: Ord<A>): USTM<Maybe<A>> {
  return self.reduceMaybe((acc, a) => (ord.gt(a, acc) ? a : acc))
}

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus static ets/TArray/Aspects maxMaybe
 */
export const maxMaybe = Pipeable(maxMaybe_)

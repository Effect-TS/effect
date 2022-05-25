/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @tsplus fluent ets/TArray exists
 */
export function exists_<A>(self: TArray<A>, f: Predicate<A>): USTM<boolean> {
  return self.find(f).map((option) => option.isSome())
}

/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @tsplus static ets/TArray/Aspects exists
 */
export const exists = Pipeable(exists_)

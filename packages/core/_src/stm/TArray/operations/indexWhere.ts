/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray indexWhere
 */
export function indexWhere_<A>(self: TArray<A>, f: Predicate<A>): USTM<number> {
  return self.indexWhereFrom(f, 0)
}

/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @tsplus static ets/TArray/Aspects indexWhere
 */
export const indexWhere = Pipeable(indexWhere_)

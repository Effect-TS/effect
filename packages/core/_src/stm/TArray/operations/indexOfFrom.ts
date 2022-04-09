/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus fluent ets/TArray indexOfFrom
 */
export function indexOfFrom_<A>(self: TArray<A>, equivalence: Equivalence<A>) {
  return (a: A, from: number): USTM<number> => self.indexWhereFrom((_) => equivalence.equals(_, a), from);
}

/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static ets/TArray/Aspects indexOfFrom
 */
export const indexOfFrom = Pipeable(indexOfFrom_);

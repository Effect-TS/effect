/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @tsplus fluent ets/TArray indexOf
 */
export function indexOf_<A>(self: TArray<A>, equivalence: Equivalence<A>) {
  return (a: A): USTM<number> => self.indexOfFrom(equivalence)(a, 0);
}

/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @tsplus static ets/TArray/Aspects indexOf
 */
export const indexOf = Pipeable(indexOf_);

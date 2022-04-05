/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @tsplus fluent ets/TArray lastIndexOf
 */
export function lastIndexOf_<A>(self: TArray<A>, equivalence: Equivalence<A>) {
  return (a: A): USTM<number> => {
    return self.lastIndexOfFrom(equivalence)(a, self.length() - 1);
  };
}

/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @tsplus static ets/TArray/Aspects lastIndexOf
 */
export const lastIndexOf = Pipeable(lastIndexOf_);

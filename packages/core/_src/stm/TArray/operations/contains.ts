/**
 * Determine if the array contains a specified value.
 *
 * @tsplus fluent ets/TArray contains
 */
export function contains_<A>(self: TArray<A>, equal: Equivalence<A>) {
  return (a: A): USTM<boolean> => self.exists((_) => equal.equals(_, a))
}

/**
 * Determine if the array contains a specified value.
 *
 * @tsplus static ets/TArray/Aspects contains
 */
export const contains = Pipeable(contains_)

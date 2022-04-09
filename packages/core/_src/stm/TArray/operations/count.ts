/**
 * Count the values in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray count
 */
export function count_<A>(self: TArray<A>, f: Predicate<A>): USTM<number> {
  return self.reduce(0, (n, a) => (f(a) ? n + 1 : n));
}

/**
 * Count the values in the array matching a predicate.
 *
 * @tsplus static ets/TArray/Aspects count
 */
export const count = Pipeable(count_);

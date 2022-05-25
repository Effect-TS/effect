/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @tsplus fluent ets/TArray forAll
 */
export function forAll_<A>(self: TArray<A>, f: Predicate<A>): USTM<boolean> {
  return self.exists((a) => !f(a)).negate()
}

/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @tsplus static ets/TArray/Aspects forAll
 */
export const forAll = Pipeable(forAll_)

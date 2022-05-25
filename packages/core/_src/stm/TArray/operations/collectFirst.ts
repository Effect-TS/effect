/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @tsplus fluent ets/TArray collectFirst
 */
export function collectFirst_<A, B>(
  self: TArray<A>,
  pf: (a: A) => Option<B>
): USTM<Option<B>> {
  return self.find((a) => pf(a).isSome()).map((option) => option.flatMap(pf))
}

/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @tsplus static ets/TArray/Aspects collectFirst
 */
export const collectFirst = Pipeable(collectFirst_)

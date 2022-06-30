/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntilMaybe
 */
export function recurUntilMaybe<A, B>(
  pf: (a: A) => Maybe<B>
): Schedule<void, never, A, Maybe<B>> {
  return Schedule.identity<A>()
    .map(pf)
    .untilOutput((_) => _.isSome())
}

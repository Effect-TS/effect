/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @tsplus static ets/Schedule/Ops recurUntilOption
 */
export function recurUntilOption<A, B>(
  pf: (a: A) => Option<B>
): Schedule<void, unknown, A, Option<B>> {
  return Schedule.identity<A>()
    .map(pf)
    .untilOutput((_) => _.isSome())
}

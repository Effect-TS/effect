import * as Option from "@fp-ts/data/Option"

/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntilOption
 * @category mutations
 * @since 1.0.0
 */
export function recurUntilOption<A, B>(
  pf: (a: A) => Option.Option<B>
): Schedule<void, never, A, Option.Option<B>> {
  return Schedule.identity<A>().map(pf).untilOutput(Option.isSome)
}

import * as Option from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static effect/core/stm/STM.Ops when
 * @category mutations
 * @since 1.0.0
 */
export function when<R, E, A>(
  predicate: LazyArg<boolean>,
  effect: STM<R, E, A>
): STM<R, E, Option.Option<A>> {
  return STM.suspend(
    predicate() ? effect.map(Option.some) : STM.succeed(Option.none)
  )
}

import type { Option } from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static effect/core/stm/STM.Aspects unless
 * @tsplus pipeable effect/core/stm/STM unless
 * @category mutations
 * @since 1.0.0
 */
export function unless(predicate: LazyArg<boolean>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, Option<A>> =>
    STM.suspend(predicate() ? STM.none : self.asSome)
}

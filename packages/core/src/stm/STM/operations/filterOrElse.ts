import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrElse
 * @tsplus pipeable effect/core/stm/STM filterOrElse
 * @category filtering
 * @since 1.0.0
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  f: Refinement<A, B>,
  orElse: LazyArg<STM<R2, E2, A2>>
): <R, E>(self: STM<R, E, A>) => STM<R | R2, E | E2, B | A2>
export function filterOrElse<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
): <R, E>(self: STM<R, E, A>) => STM<R | R2, E | E2, A | A2>
export function filterOrElse<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>): STM<R | R2, E | E2, A | A2> => self.filterOrElseWith(f, orElse)
}

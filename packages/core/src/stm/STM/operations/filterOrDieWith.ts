import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrDieWith
 * @tsplus pipeable effect/core/stm/STM filterOrDieWith
 * @category filtering
 * @since 1.0.0
 */
export function filterOrDieWith<A, B extends A>(
  f: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
export function filterOrDieWith<A>(
  f: Predicate<A>,
  dieWith: (a: A) => unknown
): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
export function filterOrDieWith<A>(f: Predicate<A>, dieWith: unknown) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> =>
    self.filterOrElseWith(f, (x) => STM.dieSync((dieWith as (a: A) => unknown)(x)))
}

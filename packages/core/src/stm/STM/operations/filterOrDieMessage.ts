import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrDieMessage
 * @tsplus pipeable effect/core/stm/STM filterOrDieMessage
 * @category filtering
 * @since 1.0.0
 */
export function filterOrDieMessage<A, B extends A>(
  f: Refinement<A, B>,
  message: string
): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: string
): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: string
) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrElse(f, STM.dieMessage(message))
}

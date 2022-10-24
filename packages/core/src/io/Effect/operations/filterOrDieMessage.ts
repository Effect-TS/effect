import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrDieMessage
 * @tsplus pipeable effect/core/io/Effect filterOrDieMessage
 * @category filtering
 * @since 1.0.0
 */
export function filterOrDieMessage<A, B extends A>(
  f: Refinement<A, B>,
  message: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.$.filterOrElse(f, Effect.dieMessage(message))(self)
}

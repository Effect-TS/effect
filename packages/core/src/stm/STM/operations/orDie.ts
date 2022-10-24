import { identity } from "@fp-ts/data/Function"

/**
 * Translates `STM` effect failure into death of the fiber, making all
 * failures unchecked and not a part of the type of the effect.
 *
 * @tsplus getter effect/core/stm/STM orDie
 * @category alternatives
 * @since 1.0.0
 */
export function orDie<R, E, A>(self: STM<R, E, A>): STM<R, never, A> {
  return self.orDieWith(identity)
}

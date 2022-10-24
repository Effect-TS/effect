import { identity } from "@fp-ts/data/Function"

/**
 * Flattens out a nested `STM` effect.
 *
 * @tsplus static effect/core/stm/STM.Ops flatten
 * @tsplus getter effect/core/stm/STM flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<R, E, R1, E1, B>(
  self: STM<R, E, STM<R1, E1, B>>
): STM<R1 | R, E | E1, B> {
  return self.flatMap(identity)
}

import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"
import { loopOnPartialChunksElements } from "./_internal/loopOnPartialChunksElements"

/**
 * Performs an effectful filter and map in a single step.
 *
 * @tsplus fluent ets/Stream collectEffect
 */
export function collectEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (a: A) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return loopOnPartialChunksElements(self, (a, emit) =>
    pf(a).fold(Effect.unit, (effect) => effect.flatMap(emit).asUnit())
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export const collectEffect = Pipeable(collectEffect_)

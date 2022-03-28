import type { Effect } from "../../../io/Effect"
import type { Sink } from "../definition"

/**
 * Effectfully transforms this sink's input elements.
 *
 * @tsplus fluent ets/Sink contramapEffect
 */
export function contramapEffect_<R, E, R2, E2, In, In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: (input: In1) => Effect<R2, E2, In>,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In1, L, Z> {
  return self.contramapChunksEffect((chunk) => chunk.mapEffect(f))
}

/**
 * Effectfully transforms this sink's input elements.
 */
export const contramapEffect = Pipeable(contramapEffect_)

/**
 * Effectfully filter the input of this sink using the specified predicate.
 *
 * @tsplus fluent ets/Sink filterInputEffect
 */
export function filterInputEffect_<R, R2, E, E2, In, In1 extends In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  p: (input: In1) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In1, L, Z> {
  return self.contramapChunksEffect((chunk) => chunk.filterEffect(p))
}

/**
 * Effectfully filter the input of this sink using the specified predicate.
 */
export const filterInputEffect = Pipeable(filterInputEffect_)

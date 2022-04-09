/**
 * Transforms this sink's input elements.
 *
 * @tsplus fluent ets/Sink contramap
 */
export function contramap_<R, E, In, In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: (input: In1) => In,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z> {
  return self.contramapChunks((chunk) => chunk.map(f));
}

/**
 * Transforms this sink's input elements.
 *
 * @tsplus static ets/Sink/Aspects contramap
 */
export const contramap = Pipeable(contramap_);

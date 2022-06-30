/**
 * Effectfully transforms this sink's input elements.
 *
 * @tsplus static effect/core/stream/Sink.Aspects contramapEffect
 * @tsplus pipeable effect/core/stream/Sink contramapEffect
 */
export function contramapEffect<In0, R2, E2, In2>(
  f: (input: In0) => Effect<R2, E2, In2>,
  __tsplusTrace?: string
) {
  return <R, E, L, Z>(self: Sink<R, E, In2, L, Z>): Sink<R | R2, E | E2, In0, L, Z> =>
    self.contramapChunksEffect((chunk) => chunk.mapEffect(f))
}

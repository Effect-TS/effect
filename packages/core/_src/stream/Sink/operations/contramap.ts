/**
 * Transforms this sink's input elements.
 *
 * @tsplus static effect/core/stream/Sink.Aspects contramap
 * @tsplus pipeable effect/core/stream/Sink contramap
 */
export function contramap<In, In1>(f: (input: In1) => In, __tsplusTrace?: string) {
  return <R, E, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z> =>
    self.contramapChunks((chunk) => chunk.map(f))
}

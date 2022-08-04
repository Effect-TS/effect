/**
 * Effectfully filter the input of this sink using the specified predicate.
 *
 * @tsplus static effect/core/stream/Sink.Aspects filterInputEffect
 * @tsplus pipeable effect/core/stream/Sink filterInputEffect
 */
export function filterInputEffect<R2, E2, In, In1 extends In>(
  p: (input: In1) => Effect<R2, E2, boolean>
) {
  return <R, E, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R | R2, E | E2, In1, L, Z> =>
    self.contramapChunksEffect((chunk) => Effect.filter(chunk, p))
}

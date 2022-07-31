/**
 * Like `Stream.runForEachChunk`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEachChunkScoped
 * @tsplus pipeable effect/core/stream/Stream runForEachChunkScoped
 */
export function runForEachChunkScoped<A, R2, E2, Z>(
  f: (chunk: Chunk<A>) => Effect<R2, E2, Z>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, void> =>
    self.runScoped(
      Sink.forEachChunk(f)
    )
}

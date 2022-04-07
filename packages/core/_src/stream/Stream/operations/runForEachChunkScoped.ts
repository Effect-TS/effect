/**
 * Like `Stream.runForEachChunk`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachChunkScoped
 */
export function runForEachChunkScoped_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Effect<R & R2 & Has<Scope>, E | E2, void> {
  return self.runScoped(Sink.forEachChunk(f));
}

/**
 * Like `Stream.runForEachChunk`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus static ets/Stream/Aspects runForEachChunkScoped
 */
export const runForEachChunkScoped = Pipeable(runForEachChunkScoped_);

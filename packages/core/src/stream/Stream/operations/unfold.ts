/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfold
 */
export function unfold<S, A>(s: S, f: (s: S) => Maybe<readonly [A, S]>): Stream<never, never, A> {
  return Stream.unfoldChunk(s, (s) => f(s).map(([a, s]) => [Chunk.single(a), s]))
}

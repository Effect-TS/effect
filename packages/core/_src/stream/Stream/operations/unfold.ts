/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfold
 */
export function unfold<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Maybe<Tuple<[A, S]>>
): Stream<never, never, A> {
  return Stream.unfoldChunk(s, (s) => f(s).map(({ tuple: [a, s] }) => Tuple(Chunk.single(a), s)))
}

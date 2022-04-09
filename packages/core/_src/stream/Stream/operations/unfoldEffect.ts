/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static ets/Stream/Ops unfoldEffect
 */
export function unfoldEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Option<Tuple<[A, S]>>>
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect<S, R, E, A>(
    s,
    (s) => f(s).map((option) => option.map(({ tuple: [a, s] }) => Tuple(Chunk.single(a), s)))
  );
}

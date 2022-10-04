/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfoldEffect
 */
export function unfoldEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, Maybe<readonly [A, S]>>
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect<S, R, E, A>(
    s,
    (s) => f(s).map((option) => option.map(([a, s]) => [Chunk.single(a), s]))
  )
}

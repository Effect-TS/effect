/**
 * Like `unfoldEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static effect/core/stream/Stream.Ops paginateEffect
 */
export function paginateEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, readonly [A, Maybe<S>]>
): Stream<R, E, A> {
  return Stream.paginateChunkEffect(
    s,
    (s) => f(s).map(([a, s]) => [Chunk.single(a), s])
  )
}

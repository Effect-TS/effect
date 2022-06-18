/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 *
 * @tsplus static ets/Stream/Ops paginate
 */
export function paginate<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Tuple<[A, Maybe<S>]>,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return Stream.paginateChunk(s, (s) => {
    const {
      tuple: [a, maybeS]
    } = f(s)
    return Tuple(Chunk.single(a), maybeS)
  })
}

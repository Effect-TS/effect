/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scan
 * @tsplus pipeable effect/core/stream/Stream scan
 */
export function scan<S, A>(
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, S> =>
    self.scanEffect(
      s,
      (s, a) => Effect.succeed(f(s, a))
    )
}

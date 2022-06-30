/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanReduceEffect
 * @tsplus pipeable effect/core/stream/Stream scanReduceEffect
 */
export function scanReduceEffect<A, R2, E2, A2 extends A>(
  f: (a2: A2, a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.mapAccumEffect(
      Maybe.emptyOf<A2>(),
      (option: Maybe<A2>, a) =>
        option.fold(
          Effect.succeedNow(Tuple(Maybe.some(a as A2), a as A2)),
          (a2) => f(a2, a).map((a2) => Tuple(Maybe.some(a2), a2))
        )
    )
}

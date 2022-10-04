/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanReduceEffect
 * @tsplus pipeable effect/core/stream/Stream scanReduceEffect
 */
export function scanReduceEffect<A, R2, E2, A2 extends A>(
  f: (a2: A2, a: A) => Effect<R2, E2, A2>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.mapAccumEffect(
      Maybe.empty<A2>(),
      (option: Maybe<A2>, a) =>
        option.fold(
          Effect.succeed([Maybe.some(a as A2), a as A2] as const),
          (a2) => f(a2, a).map((a2) => [Maybe.some(a2), a2])
        )
    )
}

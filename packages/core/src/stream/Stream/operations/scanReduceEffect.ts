import * as Option from "@fp-ts/data/Option"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanReduceEffect
 * @tsplus pipeable effect/core/stream/Stream scanReduceEffect
 * @category mutations
 * @since 1.0.0
 */
export function scanReduceEffect<A, R2, E2, A2 extends A>(
  f: (a2: A2, a: A) => Effect<R2, E2, A2>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.mapAccumEffect(
      Option.none as Option.Option<A2>,
      (option, a) => {
        switch (option._tag) {
          case "None": {
            return Effect.succeed([Option.some(a as A2), a as A2] as const)
          }
          case "Some": {
            return f(option.value, a).map((a2) => [option, a2])
          }
        }
      }
    )
}

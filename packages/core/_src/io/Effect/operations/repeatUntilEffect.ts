/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatUntilEffect
 * @tsplus pipeable effect/core/io/Effect repeatUntilEffect
 */
export function repeatUntilEffect<A, R1>(
  f: (a: A) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    self.flatMap((a) =>
      f(a).flatMap((b) => b ? Effect.succeed(a) : Effect.yieldNow.zipRight(self.repeatUntilEffect(f)))
    )
}

/**
 * Returns a new effect that repeats this effect the specified number of times
 * or until the first failure. Repeats are in addition to the first execution,
 * so that `io.repeatN(1)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatN
 * @tsplus pipeable effect/core/io/Effect repeatN
 * @category repetititon
 * @since 1.0.0
 */
export function repeatN(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => Effect.suspendSucceed(loop(self, n))
}

function loop<R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A> {
  return self.flatMap((a) =>
    n <= 0 ? Effect.succeed(a) : Effect.yieldNow.zipRight(loop(self, n - 1))
  )
}

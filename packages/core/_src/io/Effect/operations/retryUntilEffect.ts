/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryUntilEffect
 * @tsplus pipeable effect/core/io/Effect retryUntilEffect
 */
export function retryUntilEffect<R1, E>(
  f: (e: E) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    self.catchAll((e) =>
      f(e).flatMap((b) =>
        b ?
          Effect.failSync(e) :
          Effect.yieldNow > self.retryUntilEffect(f)
      )
    )
}

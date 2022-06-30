/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @tsplus static effect/core/io/Effect.Ops tryCatch
 */
export function tryCatch<E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E,
  __tsplusTrace?: string
): Effect<never, E, A> {
  return Effect.suspendSucceed(() => {
    try {
      return Effect.succeed(attempt)
    } catch (error) {
      return Effect.failNow(onThrow(error))
    }
  })
}

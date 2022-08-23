/**
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @tsplus static effect/core/io/Effect.Ops attempt
 */
export function attempt<A>(f: LazyArg<A>): Effect<never, unknown, A> {
  return Effect.sync(() => {
    try {
      return f()
    } catch (error) {
      throw new Effect.Error(Cause.fail(error))
    }
  })
}

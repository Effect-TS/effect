/**
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @tsplus static effect/core/io/Effect.Ops attempt
 * @category constructors
 * @since 1.0.0
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

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @tsplus static effect/core/io/Effect.Ops tryCatch
 * @category constructors
 * @since 1.0.0
 */
export function tryCatch<E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E
): Effect<never, E, A> {
  return Effect.sync(() => {
    try {
      return attempt()
    } catch (error) {
      throw new Effect.Error(Cause.fail(onThrow(error)))
    }
  })
}

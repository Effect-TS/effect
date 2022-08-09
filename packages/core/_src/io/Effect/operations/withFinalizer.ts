/**
 * Treats this effect as the acquisition of a resource and adds the
 * specified finalizer to the current scope. This effect will be run
 * uninterruptibly and the finalizer will be run when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Aspects withFinalizer
 * @tsplus pipeable effect/core/io/Effect withFinalizer
 */
export function withFinalizer<R2, X>(finalizer: Effect<R2, never, X>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2 | Scope, E, A> =>
    self.withFinalizerExit(() => finalizer)
}

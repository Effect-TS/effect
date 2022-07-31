/**
 * A more powerful variant of `withFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static effect/core/io/Effect.Aspects withFinalizerExit
 * @tsplus pipeable effect/core/io/Effect withFinalizerExit
 */
export function withFinalizerExit<R2, X>(
  finalizer: (exit: Exit<unknown, unknown>) => Effect<R2, never, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2 | Scope, E, A> =>
    Effect.acquireReleaseExit(self, (_, exit) => finalizer(exit))
}

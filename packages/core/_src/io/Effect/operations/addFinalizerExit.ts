/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static effect/core/io/Effect.Ops addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => Effect<R, never, X>,
  __tsplusTrace?: string
): Effect<R | Scope, never, void> {
  return Do(($) => {
    const environment = $(Effect.environment<R>())
    const scope = $(Effect.scope)
    return $(scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment)))
  })
}

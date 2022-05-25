/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static ets/Effect/Ops addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => Effect.RIO<R, X>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, never, void> {
  return Do(($) => {
    const environment = $(Effect.environment<R>())
    const scope = $(Effect.scope)
    return $(scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment)))
  })
}

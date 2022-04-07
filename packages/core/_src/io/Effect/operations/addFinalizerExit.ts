/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static ets/Effect/Ops addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => RIO<R, X>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, never, void> {
  return Effect.Do()
    .bind("environment", () => Effect.environment<R>())
    .bind("scope", () => Effect.scope)
    .flatMap(({ environment, scope }) =>
      scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment))
    );
}

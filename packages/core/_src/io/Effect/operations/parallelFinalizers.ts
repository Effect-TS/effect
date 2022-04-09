/**
 * @tsplus static ets/Effect/Ops parallelFinalizers
 */
export function parallelFinalizers<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R & HasScope, E, A> {
  return Effect.Do()
    .bind("outerScope", () => Effect.scope)
    .bind("innerScope", () => Scope.parallel())
    .tap(({ innerScope, outerScope }) => outerScope.addFinalizerExit((exit) => innerScope.close(exit)))
    .flatMap(({ innerScope }) => innerScope.extend(effect));
}

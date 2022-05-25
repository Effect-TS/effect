/**
 * @tsplus static ets/Effect/Ops parallelFinalizers
 */
export function parallelFinalizers<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, E, A> {
  return Do(($) => {
    const outerScope = $(Effect.scope)
    const innerScope = $(Scope.parallel())
    $(outerScope.addFinalizerExit((exit) => innerScope.close(exit)))
    return $(innerScope.extend(effect))
  })
}

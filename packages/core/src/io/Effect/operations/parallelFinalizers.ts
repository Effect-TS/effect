/**
 * @tsplus getter effect/core/io/Effect parallelFinalizers
 * @tsplus static effect/core/io/Effect.Ops parallelFinalizers
 * @category mutations
 * @since 1.0.0
 */
export function parallelFinalizers<R, E, A>(self: Effect<R, E, A>): Effect<R | Scope, E, A> {
  return Do(($) => {
    const outerScope = $(Effect.scope)
    const innerScope = $(Scope.parallel())
    $(outerScope.addFinalizerExit((exit) => innerScope.close(exit)))
    return $(innerScope.extend(self))
  })
}

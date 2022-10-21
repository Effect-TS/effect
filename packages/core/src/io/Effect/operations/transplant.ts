export interface Grafter {
  <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A>
}

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the fiber that
 * executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level scope,
 * effectively extending their lifespans into the parent scope.
 *
 * @tsplus static effect/core/io/Effect.Ops transplant
 */
export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.withFiberRuntime<R, E, A>((state) => {
    const scopeOverride = state.getFiberRef(FiberRef.forkScopeOverride)
    const scope = scopeOverride.getOrElse(state.scope)
    return f(FiberRef.forkScopeOverride.locally(Maybe.some(scope)))
  })
}

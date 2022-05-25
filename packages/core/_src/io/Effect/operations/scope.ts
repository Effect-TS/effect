/**
 * Returns the current scope.
 *
 * @tsplus static ets/Effect/Ops scope
 */
export const scope: Effect<Has<Scope>, never, Scope> = Effect.service(Scope.Tag)

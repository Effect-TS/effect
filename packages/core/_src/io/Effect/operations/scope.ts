/**
 * Returns the current scope.
 *
 * @tsplus static effect/core/io/Effect.Ops scope
 */
export const scope: Effect<Scope, never, Scope> = Effect.service(Scope.Tag)

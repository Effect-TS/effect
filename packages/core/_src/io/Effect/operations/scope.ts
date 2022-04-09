/**
 * Returns the current scope.
 *
 * @tsplus static ets/Effect/Ops scope
 */
export const scope: Effect<HasScope, never, Scope> = Effect.service(HasScope);

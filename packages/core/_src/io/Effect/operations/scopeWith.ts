/**
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @tsplus static ets/Effect/Ops scopeWith
 */
export function scopeWith<R, E, A>(
  f: (scope: Scope) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R & HasScope, E, A> {
  return Effect.serviceWithEffect(HasScope)(f);
}

/**
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @tsplus static ets/Effect/Ops scopeWith
 */
export function scopeWith<R, E, A>(
  f: (scope: Scope) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, E, A> {
  return Effect.serviceWithEffect(Scope.Tag)(f)
}

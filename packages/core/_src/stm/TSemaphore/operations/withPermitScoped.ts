/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus getter effect/core/stm/TSemaphore withPermitScoped
 */
export function withPermitScoped(self: TSemaphore): Effect<Scope, never, void> {
  return self.withPermitsScoped(1)
}

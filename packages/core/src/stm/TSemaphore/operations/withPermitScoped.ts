/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus getter effect/core/stm/TSemaphore withPermitScoped
 * @category aspects
 * @since 1.0.0
 */
export function withPermitScoped(self: TSemaphore): Effect<Scope, never, void> {
  return self.withPermitsScoped(1)
}

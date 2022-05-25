/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus fluent ets/TSemaphore withPermitScoped
 */
export function withPermitScoped(
  self: TSemaphore,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, void> {
  return self.withPermitsScoped(1)
}

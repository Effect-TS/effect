/**
 * @tsplus getter effect/core/stm/THub subscribeScoped
 */
export function subscribeScoped<A>(self: THub<A>, __tsplusTrace?: string): Effect<Scope, never, THub.TDequeue<A>> {
  return Effect.acquireRelease(self.subscribe.commit, (_) => _.shutdown.commit)
}

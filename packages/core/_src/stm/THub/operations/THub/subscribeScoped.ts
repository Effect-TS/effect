/**
 * Subscribes to receive messages from the hub. The resulting subscription can
 * be evaluated multiple times within the scope to take a message from the hub
 * each time.
 *
 * @tsplus getter effect/core/stm/THub subscribeScoped
 */
export function subscribeScoped<A>(self: THub<A>): Effect<Scope, never, THub.TDequeue<A>> {
  return Effect.acquireRelease(self.subscribe.commit, (_) => _.shutdown.commit)
}

/**
 * @tsplus fluent ets/THub subscribeScoped
 */
export function subscribeScoped_<A>(self: THub<A>, __tsplusTrace?: string): Effect<Scope, never, THub.TDequeue<A>> {
  return Effect.acquireRelease(self.subscribe.commit(), (_) => _.shutdown.commit(), __tsplusTrace)
}

/**
 * @tsplus static ets/THub/Aspects subscribeScoped
 */
export const subscribeScoped = Pipeable(subscribeScoped_)

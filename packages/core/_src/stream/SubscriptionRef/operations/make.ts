/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @tsplus static ets/SubscriptionRef/Ops make
 */
export function make<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect.UIO<SubscriptionRef<A>> {
  return Effect.suspendSucceed(
    Effect.struct({
      ref: SynchronizedRef.make(value),
      hub: Hub.unbounded<A>()
    }).map(({ hub, ref }) => new SubscriptionRef(ref, hub))
  )
}

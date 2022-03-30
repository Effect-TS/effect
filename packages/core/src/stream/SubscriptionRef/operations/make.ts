import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import { Hub } from "../../../io/Hub"
import { SynchronizedRef } from "../../../io/Ref/Synchronized"
import { SubscriptionRef } from "../definition"

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @tsplus static ets/SubscriptionRefOps make
 */
export function make<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): UIO<SubscriptionRef<A>> {
  return Effect.suspendSucceed(
    Effect.struct({
      ref: SynchronizedRef.make(value),
      hub: Hub.unbounded<A>()
    }).map(({ hub, ref }) => new SubscriptionRef(ref, hub))
  )
}

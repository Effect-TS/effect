import { makeDeferred } from "../Deferred"
import { applySecond, map_, Sync, unit } from "../Effect"
import { identity } from "../Function"
import { makeRef } from "../Ref"

import type { ConcurrentQueue } from "./ConcurrentQueue"
import { initial } from "./initial"
import { makeConcurrentQueueImpl } from "./makeConcurrentQueueImpl"
import { natCapacity } from "./natCapacity"
import { slidingOffer } from "./slidingOffer"

/**
 * Create a bounded queue with the given capacity that drops older offers
 * @param capacity
 */
export function slidingQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natCapacity(capacity),
    map_(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        slidingOffer(capacity),
        unit,
        identity
      )
    )
  )
}

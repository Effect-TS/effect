import { makeDeferred } from "../Deferred"
import { applySecond, map_, Sync, unit } from "../Effect"
import { identity } from "../Function"
import { makeRef } from "../Ref"

import { ConcurrentQueue } from "./ConcurrentQueue"
import { droppingOffer } from "./droppingOffer"
import { initial } from "./initial"
import { makeConcurrentQueueImpl } from "./makeConcurrentQueueImpl"
import { natNumber } from "./natNumber"

/**
 * Create a dropping queue with the given capacity that drops offers on full
 * @param capacity
 */
export function droppingQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natNumber(new Error("Die: capacity must be a natural number"))(capacity),
    map_(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        droppingOffer(capacity),
        unit,
        identity
      )
    )
  )
}

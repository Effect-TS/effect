import { makeDeferred } from "../Deferred"
import { map_, Sync, unit } from "../Effect"
import { identity } from "../Function"
import { makeRef } from "../Ref"

import { ConcurrentQueue } from "./ConcurrentQueue"
import { initial } from "./initial"
import { makeConcurrentQueueImpl } from "./makeConcurrentQueueImpl"
import { unboundedOffer } from "./unboundedOffer"
/**
 * Create an unbounded concurrent queue
 */

export function unboundedQueue<A>(): Sync<ConcurrentQueue<A>> {
  return map_(makeRef(initial<A>()), (ref) =>
    makeConcurrentQueueImpl(
      ref,
      makeDeferred<unknown, unknown, never, A>(),
      unboundedOffer,
      unit,
      identity
    )
  )
}

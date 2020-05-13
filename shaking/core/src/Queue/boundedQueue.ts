import { makeDeferred } from "../Deferred"
import { applySecond, bracketExit, Sync, unit, zipWith_ } from "../Effect"
import { makeRef } from "../Ref"
import { makeSemaphore } from "../Semaphore"

import type { ConcurrentQueue } from "./ConcurrentQueue"
import { initial } from "./initial"
import { makeConcurrentQueueImpl } from "./makeConcurrentQueueImpl"
import { natCapacity } from "./natCapacity"
import { unboundedOffer } from "./unboundedOffer"

/**
 * Create a bounded queue that blocks offers on capacity
 * @param capacity
 */
export function boundedQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natCapacity(capacity),
    zipWith_(makeRef(initial<A>()), makeSemaphore(capacity), (ref, sem) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        unboundedOffer,
        sem.acquire,
        (inner) =>
          // Before take, we must release the semaphore. If we are interrupted we should re-acquire the item
          bracketExit(
            sem.release,
            (_, exit) => (exit._tag === "Interrupt" ? sem.acquire : unit),
            () => inner
          )
      )
    )
  )
}

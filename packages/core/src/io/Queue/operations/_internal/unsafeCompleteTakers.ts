import { unsafeCompleteDeferred } from "@effect/core/io/Queue/operations/_internal/unsafeCompleteDeferred"
import { unsafeOfferAll } from "@effect/core/io/Queue/operations/_internal/unsafeOfferAll"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"
import type { Strategy } from "@effect/core/io/Queue/operations/strategy"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/** @internal */
export function unsafeCompleteTakers<A>(
  strategy: Strategy<A>,
  queue: MutableQueue.MutableQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred<never, A>>
): void {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true
  while (keepPolling && !MutableQueue.isEmpty(queue)) {
    const taker = pipe(takers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (taker !== MutableQueue.EmptyMutableQueue) {
      const element = pipe(queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (element !== MutableQueue.EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue, takers)
      } else {
        unsafeOfferAll(takers, pipe(unsafePollAll(takers), List.prepend(taker)))
      }
      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}

// ets_tracing: off

import * as ChunkFilter from "../Collections/Immutable/Chunk/api/filter.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import type { AtomicBoolean } from "../Support/AtomicBoolean/index.js"
import type { MutableQueue } from "../Support/MutableQueue/index.js"
import { EmptyQueue } from "../Support/MutableQueue/index.js"
import * as T from "./effect.js"
import * as P from "./promise.js"
import type { XQueue } from "./xqueue.js"
import { concreteQueue } from "./xqueue.js"

export { Dequeue, Queue, XQueue } from "./xqueue.js"

export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk.Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<P.Promise<never, A>>,
    isShutdown: AtomicBoolean
  ) => T.UIO<boolean>

  readonly unsafeOnQueueEmptySpace: (
    queue: MutableQueue<A>,
    takers: MutableQueue<P.Promise<never, A>>
  ) => void

  readonly surplusSize: number

  readonly shutdown: T.UIO<void>
}

export class DroppingStrategy<A> implements Strategy<A> {
  handleSurplus(
    _as: Chunk.Chunk<A>,
    _queue: MutableQueue<A>,
    _takers: MutableQueue<P.Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): T.UIO<boolean> {
    return T.succeed(false)
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
    //
  }

  get shutdown(): T.UIO<void> {
    return T.unit
  }

  get surplusSize(): number {
    return 0
  }
}

export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: Chunk.Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<P.Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): T.UIO<boolean> {
    return T.succeedWith(() => {
      this.unsafeSlidingOffer(queue, as)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
    //
  }

  get shutdown(): T.UIO<void> {
    return T.unit
  }

  get surplusSize(): number {
    return 0
  }

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: Chunk.Chunk<A>) {
    let bs = as

    while (Chunk.size(bs) > 0) {
      if (queue.capacity === 0) {
        return
      }

      // poll 1 and retry
      queue.poll(EmptyQueue)

      if (queue.offer(Chunk.unsafeGet_(bs, 0))) {
        bs = Chunk.drop_(bs, 1)
      }
    }
  }
}

export function unsafeCompletePromise<A>(p: P.Promise<never, A>, a: A) {
  return P.unsafeDone(T.succeed(a))(p)
}

export function unsafeCompleteTakers<A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<P.Promise<never, A>>
) {
  let keepPolling = true

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(EmptyQueue)

    if (taker !== EmptyQueue) {
      const element = queue.poll(EmptyQueue)

      if (element !== EmptyQueue) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue, takers)
      } else {
        unsafeOfferAll(takers, Chunk.prepend_(unsafePollAll(takers), taker))
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}

export function unsafeRemove<A>(q: MutableQueue<A>, a: A) {
  unsafeOfferAll(
    q,
    ChunkFilter.filter_(unsafePollAll(q), (b) => a !== b)
  )
}

export function unsafePollN<A>(q: MutableQueue<A>, max: number): Chunk.Chunk<A> {
  return q.pollUpTo(max)
}

export function unsafeOfferAll<A>(
  q: MutableQueue<A>,
  as: Chunk.Chunk<A>
): Chunk.Chunk<A> {
  return q.offerAll(as)
}

export function unsafePollAll<A>(q: MutableQueue<A>): Chunk.Chunk<A> {
  let as = Chunk.empty<A>()

  while (!q.isEmpty) {
    const elem = q.poll(EmptyQueue)!
    if (elem !== EmptyQueue) {
      as = Chunk.append_(as, elem)
    }
  }

  return as
}

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) {
  concreteQueue(self)
  return self.awaitShutdown
}

/**
 * How many elements can hold in the queue
 */
export function capacity<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.capacity
}

/**
 * `true` if `shutdown` has been called.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.isShutdown
}

/**
 * Places one value in the queue.
 *
 * @ets_data_first offer_
 */
export function offer<A>(a: A) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => offer_(self, a)
}

/**
 * Places one value in the queue.
 */
export function offer_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, a: A) {
  concreteQueue(self)
  return self.offer(a)
}

/**
 * Places one value in the queue.
 *
 * @ets_data_first offerTo_
 */
export function offerTo<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return (a: A) => offer_(self, a)
}

/**
 * Places one value in the queue.
 *
 * @ets_data_first offerTo_
 */
export function offerTo_<RA, RB, EA, EB, A, B>(
  a: A,
  self: XQueue<RA, RB, EA, EB, A, B>
) {
  return offer_(self, a)
}

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 * @ets_data_first offerAll_
 */
export function offerAll<A>(as: Iterable<A>) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => offerAll_(self, as)
}

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 */
export function offerAll_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
) {
  concreteQueue(self)
  return self.offerAll(as)
}

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.shutdown
}

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export function size<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.size
}

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export function take<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.take
}

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export function takeAll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  concreteQueue(self)
  return self.takeAll
}

/**
 * Takes up to max number of values in the queue.
 *
 * @ets_data_first takeAllUpTo_
 */
export function takeAllUpTo(n: number) {
  return <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    takeAllUpTo_(self, n)
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
) {
  concreteQueue(self)
  return self.takeUpTo(n)
}

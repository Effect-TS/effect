// tracing: off

import * as ChunkFilter from "../Collections/Immutable/Chunk/api/filter"
import * as Chunk from "../Collections/Immutable/Chunk/core"
import type { AtomicBoolean } from "../Support/AtomicBoolean"
import type { MutableQueue } from "../Support/MutableQueue"
import * as T from "./effect"
import * as P from "./promise"

export { Dequeue, Queue, XQueue } from "./xqueue"

export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk.Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<P.Promise<never, A>>,
    isShutdown: AtomicBoolean
  ) => T.UIO<boolean>

  readonly unsafeOnQueueEmptySpace: (queue: MutableQueue<A>) => void

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
    return T.effectTotal(() => {
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
      queue.poll(undefined)

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
    const taker = takers.poll(undefined)

    if (taker != null) {
      const element = queue.poll(undefined)

      if (element != null) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue)
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
  ChunkFilter.filter_(unsafeOfferAll(q, unsafePollAll(q)), (b) => a !== b)
}

export function unsafePollN<A>(q: MutableQueue<A>, max: number): Chunk.Chunk<A> {
  let j = 0
  let as = Chunk.empty<A>()

  while (j < max) {
    const p = q.poll(undefined)

    if (p != null) {
      as = Chunk.append_(as, p)
    } else {
      return as
    }

    j += 1
  }

  return as
}

export function unsafeOfferAll<A>(
  q: MutableQueue<A>,
  as: Chunk.Chunk<A>
): Chunk.Chunk<A> {
  let bs = as

  while (Chunk.size(bs) > 0) {
    if (!q.offer(Chunk.unsafeGet_(bs, 0)!)) {
      return bs
    } else {
      bs = Chunk.drop_(bs, 1)
    }
  }

  return bs
}

export function unsafePollAll<A>(q: MutableQueue<A>): Chunk.Chunk<A> {
  let as = Chunk.empty<A>()

  while (!q.isEmpty) {
    as = Chunk.append_(as, q.poll(undefined)!)
  }

  return as
}

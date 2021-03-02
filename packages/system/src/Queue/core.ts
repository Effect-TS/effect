import type { AtomicBoolean } from "../Support/AtomicBoolean"
import type { MutableQueue } from "../Support/MutableQueue"
import * as T from "./effect"
import * as P from "./promise"

export { Dequeue, Queue, XQueue } from "./xqueue"

export interface Strategy<A> {
  readonly handleSurplus: (
    as: readonly A[],
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
    _as: readonly A[],
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
    as: readonly A[],
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

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: readonly A[]) {
    const bs = Array.from(as)

    while (bs.length > 0) {
      if (queue.capacity === 0) {
        return
      }
      // poll 1 and retry
      queue.poll(undefined)

      if (queue.offer(bs[0]!)) {
        bs.shift()
      }
    }
  }
}

export const unsafeCompletePromise = <A>(p: P.Promise<never, A>, a: A) =>
  P.unsafeDone(T.succeed(a))(p)

export const unsafeCompleteTakers = <A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<P.Promise<never, A>>
) => {
  let keepPolling = true

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(undefined)

    if (taker != null) {
      const element = queue.poll(undefined)

      if (element != null) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue)
      } else {
        unsafeOfferAll(takers, [taker, ...unsafePollAll(takers)])
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}

export const unsafeRemove = <A>(q: MutableQueue<A>, a: A) => {
  unsafeOfferAll(q, unsafePollAll(q)).filter((b) => a !== b)
}

export const unsafePollN = <A>(q: MutableQueue<A>, max: number): readonly A[] => {
  let j = 0
  const as = [] as A[]

  while (j < max) {
    const p = q.poll(undefined)

    if (p != null) {
      as.push(p)
    } else {
      return as
    }

    j += 1
  }

  return as
}

export const unsafeOfferAll = <A>(
  q: MutableQueue<A>,
  as: readonly A[]
): readonly A[] => {
  const bs = Array.from(as)

  while (bs.length > 0) {
    if (!q.offer(bs[0]!)) {
      return bs
    } else {
      bs.shift()
    }
  }

  return bs
}

export const unsafePollAll = <A>(q: MutableQueue<A>): readonly A[] => {
  const as = [] as A[]

  while (!q.isEmpty) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    as.push(q.poll(undefined)!)
  }

  return as
}

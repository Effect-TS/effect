import type { Chunk } from "../../../collection/immutable/Chunk"
import type { AtomicBoolean } from "../../../support/AtomicBoolean"
import type { MutableQueue } from "../../../support/MutableQueue"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../../Promise"
import { unsafeCompleteTakers } from "./_internal/unsafeCompleteTakers"

/**
 * @tsplus type ets/QueueStrategy
 */
export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean,
    __etsTrace?: string
  ) => UIO<boolean>

  readonly unsafeOnQueueEmptySpace: (
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>
  ) => void

  readonly surplusSize: number

  readonly shutdown: UIO<void>
}

/**
 * @tsplus type ets/QueueStrategyOps
 */
export interface StrategyOps {}
export const Strategy: StrategyOps = {}

export class DroppingStrategy<A> implements Strategy<A> {
  // Do nothing, drop the surplus
  handleSurplus(
    _as: Chunk<A>,
    _queue: MutableQueue<A>,
    _takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean,
    __etsTrace?: string
  ): UIO<boolean> {
    return Effect.succeedNow(false)
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>): void {
    //
  }

  get surplusSize(): number {
    return 0
  }

  get shutdown(): UIO<void> {
    return Effect.unit
  }
}

export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean,
    __etsTrace?: string
  ): UIO<boolean> {
    return Effect.succeed(() => {
      this.unsafeSlidingOffer(queue, as)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>): void {
    //
  }

  get surplusSize(): number {
    return 0
  }

  get shutdown(): UIO<void> {
    return Effect.unit
  }

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: Chunk<A>) {
    let bs = as
    while (bs.size > 0) {
      if (queue.capacity === 0) {
        return
      }
      // Poll 1 and retry
      queue.poll(undefined)
      if (queue.offer(bs.unsafeGet(0))) {
        bs = bs.drop(1)
      }
    }
  }
}

/**
 * @tsplus static ets/QueueStrategyOps Sliding
 */
export function slidingStrategy<A>() {
  return new SlidingStrategy<A>()
}

/**
 * @tsplus static ets/QueueStrategyOps Dropping
 */
export function dropppingStrategy<A>() {
  return new DroppingStrategy<A>()
}

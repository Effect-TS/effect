import { unsafeCompleteTakers } from "@effect/core/io/Queue/operations/_internal/unsafeCompleteTakers"

/**
 * @tsplus type effect/core/io/Queue/Strategy
 */
export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Deferred<never, A>>,
    isShutdown: AtomicBoolean
  ) => Effect<never, never, boolean>

  readonly unsafeOnQueueEmptySpace: (
    queue: MutableQueue<A>,
    takers: MutableQueue<Deferred<never, A>>
  ) => void

  readonly surplusSize: number

  readonly shutdown: Effect<never, never, void>
}

/**
 * @tsplus type effect/core/io/Queue/Strategy.Ops
 */
export interface StrategyOps {}
export const Strategy: StrategyOps = {}

export class DroppingStrategy<A> implements Strategy<A> {
  // Do nothing, drop the surplus
  handleSurplus(
    _as: Chunk<A>,
    _queue: MutableQueue<A>,
    _takers: MutableQueue<Deferred<never, A>>,
    _isShutdown: AtomicBoolean
  ): Effect<never, never, boolean> {
    return Effect.succeed(false)
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>): void {
    //
  }

  get surplusSize(): number {
    return 0
  }

  get shutdown(): Effect<never, never, void> {
    return Effect.unit
  }
}

export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Deferred<never, A>>,
    _isShutdown: AtomicBoolean
  ): Effect<never, never, boolean> {
    return Effect.sync(() => {
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

  get shutdown(): Effect<never, never, void> {
    return Effect.unit
  }

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: Chunk<A>) {
    let bs = as
    while (bs.size > 0) {
      if (queue.capacity === 0) {
        return
      }

      // Poll 1 and retry
      queue.poll(EmptyMutableQueue)

      if (queue.offer(bs.unsafeGet(0))) {
        bs = bs.drop(1)
      }
    }
  }
}

/**
 * @tsplus static effect/core/io/Queue/Strategy.Ops Sliding
 */
export function slidingStrategy<A>() {
  return new SlidingStrategy<A>()
}

/**
 * @tsplus static effect/core/io/Queue/Strategy.Ops Dropping
 */
export function dropppingStrategy<A>() {
  return new DroppingStrategy<A>()
}

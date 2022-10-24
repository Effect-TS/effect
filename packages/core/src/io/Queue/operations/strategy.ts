import { unsafeCompleteTakers } from "@effect/core/io/Queue/operations/_internal/unsafeCompleteTakers"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import type { MutableRef } from "@fp-ts/data/mutable/MutableRef"

/**
 * @tsplus type effect/core/io/Queue/Strategy
 * @category model
 * @since 1.0.0
 */
export interface Strategy<A> {
  readonly handleSurplus: (
    as: Chunk.Chunk<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred<never, A>>,
    isShutdown: MutableRef<boolean>
  ) => Effect<never, never, boolean>

  readonly unsafeOnQueueEmptySpace: (
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred<never, A>>
  ) => void

  readonly surplusSize: number

  readonly shutdown: Effect<never, never, void>
}

/**
 * @tsplus type effect/core/io/Queue/Strategy.Ops
 * @category model
 * @since 1.0.0
 */
export interface StrategyOps {}
export const Strategy: StrategyOps = {}

/**
 * @category  model
 * @since 1.0.0
 */
export class DroppingStrategy<A> implements Strategy<A> {
  // Do nothing, drop the surplus
  handleSurplus(
    _as: Chunk.Chunk<A>,
    _queue: MutableQueue.MutableQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred<never, A>>,
    _isShutdown: MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.succeed(false)
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue.MutableQueue<A>): void {
    //
  }

  get surplusSize(): number {
    return 0
  }

  get shutdown(): Effect<never, never, void> {
    return Effect.unit
  }
}

/**
 * @category  model
 * @since 1.0.0
 */
export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: Chunk.Chunk<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred<never, A>>,
    _isShutdown: MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.sync(() => {
      this.unsafeSlidingOffer(queue, as)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue.MutableQueue<A>): void {
    //
  }

  get surplusSize(): number {
    return 0
  }

  get shutdown(): Effect<never, never, void> {
    return Effect.unit
  }

  private unsafeSlidingOffer(queue: MutableQueue.MutableQueue<A>, as: Chunk.Chunk<A>) {
    let bs = as
    while (bs.length > 0) {
      if (MutableQueue.capacity(queue) === 0) {
        return
      }

      // Poll 1 and retry
      pipe(queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))

      if (pipe(queue, MutableQueue.offer(pipe(bs, Chunk.unsafeGet(0))))) {
        bs = pipe(bs, Chunk.drop(1))
      }
    }
  }
}

/**
 * @tsplus static effect/core/io/Queue/Strategy.Ops Sliding
 * @category constructors
 * @since 1.0.0
 */
export function slidingStrategy<A>() {
  return new SlidingStrategy<A>()
}

/**
 * @tsplus static effect/core/io/Queue/Strategy.Ops Dropping
 * @category constructors
 * @since 1.0.0
 */
export function dropppingStrategy<A>() {
  return new DroppingStrategy<A>()
}

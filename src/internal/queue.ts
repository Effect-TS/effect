import * as Chunk from "../Chunk.js"
import type * as Deferred from "../Deferred.js"
import type * as Effect from "../Effect.js"
import { dual, pipe } from "../Function.js"
import * as MutableQueue from "../MutableQueue.js"
import * as MutableRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as Queue from "../Queue.js"
import * as ReadonlyArray from "../ReadonlyArray.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"

/** @internal */
const EnqueueSymbolKey = "effect/QueueEnqueue"

/** @internal */
export const EnqueueTypeId: Queue.EnqueueTypeId = Symbol.for(EnqueueSymbolKey) as Queue.EnqueueTypeId

/** @internal */
const DequeueSymbolKey = "effect/QueueDequeue"

/** @internal */
export const DequeueTypeId: Queue.DequeueTypeId = Symbol.for(DequeueSymbolKey) as Queue.DequeueTypeId

/** @internal */
const QueueStrategySymbolKey = "effect/QueueStrategy"

/** @internal */
export const QueueStrategyTypeId: Queue.QueueStrategyTypeId = Symbol.for(
  QueueStrategySymbolKey
) as Queue.QueueStrategyTypeId

/** @internal */
const queueStrategyVariance = {
  _A: (_: never) => _
}

/** @internal */
export const enqueueVariance = {
  _In: (_: unknown) => _
}

/** @internal */
export const dequeueVariance = {
  _Out: (_: never) => _
}

/** @internal */
class QueueImpl<A> implements Queue.Queue<A> {
  readonly [EnqueueTypeId] = enqueueVariance
  readonly [DequeueTypeId] = dequeueVariance

  constructor(
    /** @internal */
    readonly queue: Queue.BackingQueue<A>,
    /** @internal */
    readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    /** @internal */
    readonly shutdownHook: Deferred.Deferred<never, void>,
    /** @internal */
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    /** @internal */
    readonly strategy: Queue.Strategy<A>
  ) {
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  capacity(): number {
    return this.queue.capacity()
  }

  size(): Effect.Effect<never, never, number> {
    return core.suspend(() => core.catchAll(this.unsafeSize(), () => core.interrupt))
  }

  unsafeSize() {
    if (MutableRef.get(this.shutdownFlag)) {
      return Option.none<number>()
    }
    return Option.some(
      this.queue.length() -
        MutableQueue.length(this.takers) +
        this.strategy.surplusSize()
    )
  }

  isEmpty(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size <= 0)
  }

  isFull(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size >= this.capacity())
  }

  shutdown(): Effect.Effect<never, never, void> {
    return core.uninterruptible(
      core.withFiberRuntime<never, never, void>((state) => {
        pipe(this.shutdownFlag, MutableRef.set(true))
        return pipe(
          fiberRuntime.forEachParUnboundedDiscard(
            unsafePollAll(this.takers),
            (d) => core.deferredInterruptWith(d, state.id()),
            false
          ),
          core.zipRight(this.strategy.shutdown()),
          core.whenEffect(core.deferredSucceed(this.shutdownHook, void 0)),
          core.asUnit
        )
      })
    )
  }

  isShutdown(): Effect.Effect<never, never, boolean> {
    return core.sync(() => MutableRef.get(this.shutdownFlag))
  }

  awaitShutdown(): Effect.Effect<never, never, void> {
    return core.deferredAwait(this.shutdownHook)
  }

  isActive() {
    return !MutableRef.get(this.shutdownFlag)
  }

  unsafeOffer(value: A): boolean {
    if (MutableRef.get(this.shutdownFlag)) {
      return false
    }
    let noRemaining: boolean
    if (this.queue.length() === 0) {
      const taker = pipe(
        this.takers,
        MutableQueue.poll(MutableQueue.EmptyMutableQueue)
      )
      if (taker !== MutableQueue.EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, value)
        noRemaining = true
      } else {
        noRemaining = false
      }
    } else {
      noRemaining = false
    }
    if (noRemaining) {
      return true
    }
    // Not enough takers, offer to the queue
    const succeeded = this.queue.offer(value)
    unsafeCompleteTakers(this.strategy, this.queue, this.takers)
    return succeeded
  }

  offer(value: A): Effect.Effect<never, never, boolean> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      let noRemaining: boolean
      if (this.queue.length() === 0) {
        const taker = pipe(
          this.takers,
          MutableQueue.poll(MutableQueue.EmptyMutableQueue)
        )
        if (taker !== MutableQueue.EmptyMutableQueue) {
          unsafeCompleteDeferred(taker, value)
          noRemaining = true
        } else {
          noRemaining = false
        }
      } else {
        noRemaining = false
      }
      if (noRemaining) {
        return core.succeed(true)
      }
      // Not enough takers, offer to the queue
      const succeeded = this.queue.offer(value)
      unsafeCompleteTakers(this.strategy, this.queue, this.takers)
      return succeeded
        ? core.succeed(true)
        : this.strategy.handleSurplus([value], this.queue, this.takers, this.shutdownFlag)
    })
  }

  offerAll(iterable: Iterable<A>): Effect.Effect<never, never, boolean> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const values = ReadonlyArray.fromIterable(iterable)
      const pTakers = this.queue.length() === 0
        ? ReadonlyArray.fromIterable(unsafePollN(this.takers, values.length))
        : ReadonlyArray.empty
      const [forTakers, remaining] = pipe(values, ReadonlyArray.splitAt(pTakers.length))
      for (let i = 0; i < pTakers.length; i++) {
        const taker = (pTakers as any)[i]
        const item = forTakers[i]
        unsafeCompleteDeferred(taker, item)
      }
      if (remaining.length === 0) {
        return core.succeed(true)
      }
      // Not enough takers, offer to the queue
      const surplus = this.queue.offerAll(remaining)
      unsafeCompleteTakers(this.strategy, this.queue, this.takers)
      return Chunk.isEmpty(surplus)
        ? core.succeed(true)
        : this.strategy.handleSurplus(surplus, this.queue, this.takers, this.shutdownFlag)
    })
  }

  take(): Effect.Effect<never, never, A> {
    return core.withFiberRuntime<never, never, A>((state) => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const item = this.queue.poll(MutableQueue.EmptyMutableQueue)
      if (item !== MutableQueue.EmptyMutableQueue) {
        this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
        return core.succeed(item)
      } else {
        // Add the deferred to takers, then:
        // - Try to take again in case a value was added since
        // - Wait for the deferred to be completed
        // - Clean up resources in case of interruption
        const deferred = core.deferredUnsafeMake<never, A>(state.id())
        return pipe(
          core.suspend(() => {
            pipe(this.takers, MutableQueue.offer(deferred))
            unsafeCompleteTakers(this.strategy, this.queue, this.takers)
            return MutableRef.get(this.shutdownFlag) ?
              core.interrupt :
              core.deferredAwait(deferred)
          }),
          core.onInterrupt(() => {
            return core.sync(() => unsafeRemove(this.takers, deferred))
          })
        )
      }
    })
  }

  takeAll(): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() => {
      return MutableRef.get(this.shutdownFlag)
        ? core.interrupt
        : core.sync(() => {
          const values = this.queue.pollUpTo(Number.POSITIVE_INFINITY)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return Chunk.fromIterable(values)
        })
    })
  }

  takeUpTo(max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() =>
      MutableRef.get(this.shutdownFlag)
        ? core.interrupt
        : core.sync(() => {
          const values = this.queue.pollUpTo(max)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return Chunk.fromIterable(values)
        })
    )
  }

  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() =>
      takeRemainderLoop(
        this,
        min,
        max,
        Chunk.empty()
      )
    )
  }
}

/** @internal */
const takeRemainderLoop = <A>(
  self: Queue.Dequeue<A>,
  min: number,
  max: number,
  acc: Chunk.Chunk<A>
): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  if (max < min) {
    return core.succeed(acc)
  }
  return pipe(
    takeUpTo(self, max),
    core.flatMap((bs) => {
      const remaining = min - bs.length
      if (remaining === 1) {
        return pipe(
          take(self),
          core.map((b) => pipe(acc, Chunk.appendAll(bs), Chunk.append(b)))
        )
      }
      if (remaining > 1) {
        return pipe(
          take(self),
          core.flatMap((b) =>
            takeRemainderLoop(
              self,
              remaining - 1,
              max - bs.length - 1,
              pipe(acc, Chunk.appendAll(bs), Chunk.append(b))
            )
          )
        )
      }
      return core.succeed(pipe(acc, Chunk.appendAll(bs)))
    })
  )
}

/** @internal */
export const isQueue = (u: unknown): u is Queue.Queue<unknown> => isEnqueue(u) && isDequeue(u)

/** @internal */
export const isEnqueue = (u: unknown): u is Queue.Enqueue<unknown> => hasProperty(u, EnqueueTypeId)

/** @internal */
export const isDequeue = (u: unknown): u is Queue.Dequeue<unknown> => hasProperty(u, DequeueTypeId)

/** @internal */
export const bounded = <A>(requestedCapacity: number): Effect.Effect<never, never, Queue.Queue<A>> =>
  pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(backingQueueFromMutableQueue(queue), backPressureStrategy()))
  )

/** @internal */
export const dropping = <A>(requestedCapacity: number): Effect.Effect<never, never, Queue.Queue<A>> =>
  pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(backingQueueFromMutableQueue(queue), droppingStrategy()))
  )

/** @internal */
export const sliding = <A>(requestedCapacity: number): Effect.Effect<never, never, Queue.Queue<A>> =>
  pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(backingQueueFromMutableQueue(queue), slidingStrategy()))
  )

/** @internal */
export const unbounded = <A>(): Effect.Effect<never, never, Queue.Queue<A>> =>
  pipe(
    core.sync(() => MutableQueue.unbounded<A>()),
    core.flatMap((queue) => make(backingQueueFromMutableQueue(queue), droppingStrategy()))
  )

/** @internal */
const unsafeMake = <A>(
  queue: Queue.BackingQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
  shutdownHook: Deferred.Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: Queue.Strategy<A>
): Queue.Queue<A> => {
  return new QueueImpl(queue, takers, shutdownHook, shutdownFlag, strategy)
}

/** @internal */
export const make = <A>(
  queue: Queue.BackingQueue<A>,
  strategy: Queue.Strategy<A>
): Effect.Effect<never, never, Queue.Queue<A>> =>
  pipe(
    core.deferredMake<never, void>(),
    core.map((deferred) =>
      unsafeMake(
        queue,
        MutableQueue.unbounded(),
        deferred,
        MutableRef.make(false),
        strategy
      )
    )
  )

/** @internal */
export class BackingQueueFromMutableQueue<A> implements Queue.BackingQueue<A> {
  constructor(readonly mutable: MutableQueue.MutableQueue<A>) {}
  poll<Def>(def: Def): A | Def {
    return MutableQueue.poll(this.mutable, def)
  }
  pollUpTo(limit: number): Chunk.Chunk<A> {
    return MutableQueue.pollUpTo(this.mutable, limit)
  }
  offerAll(elements: Iterable<A>): Chunk.Chunk<A> {
    return MutableQueue.offerAll(this.mutable, elements)
  }
  offer(element: A): boolean {
    return MutableQueue.offer(this.mutable, element)
  }
  capacity(): number {
    return MutableQueue.capacity(this.mutable)
  }
  length(): number {
    return MutableQueue.length(this.mutable)
  }
}

/** @internal */
export const backingQueueFromMutableQueue = <A>(mutable: MutableQueue.MutableQueue<A>): Queue.BackingQueue<A> =>
  new BackingQueueFromMutableQueue(mutable)

/** @internal */
export const capacity = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): number => self.capacity()

/** @internal */
export const size = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, number> => self.size()

/** @internal */
export const isFull = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, boolean> =>
  self.isFull()

/** @internal */
export const isEmpty = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, boolean> =>
  self.isEmpty()

/** @internal */
export const isShutdown = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, boolean> =>
  self.isShutdown()

/** @internal */
export const awaitShutdown = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, void> =>
  self.awaitShutdown()

/** @internal */
export const shutdown = <A>(self: Queue.Dequeue<A> | Queue.Enqueue<A>): Effect.Effect<never, never, void> =>
  self.shutdown()

/** @internal */
export const offer = dual<
  <A>(value: A) => (self: Queue.Enqueue<A>) => Effect.Effect<never, never, boolean>,
  <A>(self: Queue.Enqueue<A>, value: A) => Effect.Effect<never, never, boolean>
>(2, (self, value) => self.offer(value))

/** @internal */
export const unsafeOffer = dual<
  <A>(value: A) => (self: Queue.Enqueue<A>) => boolean,
  <A>(self: Queue.Enqueue<A>, value: A) => boolean
>(2, (self, value) => self.unsafeOffer(value))

/** @internal */
export const offerAll = dual<
  <A>(
    iterable: Iterable<A>
  ) => (self: Queue.Enqueue<A>) => Effect.Effect<never, never, boolean>,
  <A>(
    self: Queue.Enqueue<A>,
    iterable: Iterable<A>
  ) => Effect.Effect<never, never, boolean>
>(2, (self, iterable) => self.offerAll(iterable))

/** @internal */
export const poll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Option.Option<A>> =>
  core.map(self.takeUpTo(1), Chunk.head)

/** @internal */
export const take = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, A> => self.take()

/** @internal */
export const takeAll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => self.takeAll()

/** @internal */
export const takeUpTo = dual<
  (max: number) => <A>(self: Queue.Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>,
  <A>(self: Queue.Dequeue<A>, max: number) => Effect.Effect<never, never, Chunk.Chunk<A>>
>(2, (self, max) => self.takeUpTo(max))

/** @internal */
export const takeBetween = dual<
  (min: number, max: number) => <A>(self: Queue.Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>,
  <A>(self: Queue.Dequeue<A>, min: number, max: number) => Effect.Effect<never, never, Chunk.Chunk<A>>
>(3, (self, min, max) => self.takeBetween(min, max))

/** @internal */
export const takeN = dual<
  (n: number) => <A>(self: Queue.Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>,
  <A>(self: Queue.Dequeue<A>, n: number) => Effect.Effect<never, never, Chunk.Chunk<A>>
>(2, (self, n) => self.takeBetween(n, n))

// -----------------------------------------------------------------------------
// Strategy
// -----------------------------------------------------------------------------

/** @internal */
export const backPressureStrategy = <A>(): Queue.Strategy<A> => new BackPressureStrategy()

/** @internal */
export const droppingStrategy = <A>(): Queue.Strategy<A> => new DroppingStrategy()

/** @internal */
export const slidingStrategy = <A>(): Queue.Strategy<A> => new SlidingStrategy()

/** @internal */
class BackPressureStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  readonly putters = MutableQueue.unbounded<readonly [A, Deferred.Deferred<never, boolean>, boolean]>()

  surplusSize(): number {
    return MutableQueue.length(this.putters)
  }

  onCompleteTakersWithEmptyQueue(takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>): void {
    while (!MutableQueue.isEmpty(this.putters) && !MutableQueue.isEmpty(takers)) {
      const taker = MutableQueue.poll(takers, void 0)!
      const putter = MutableQueue.poll(this.putters, void 0)!
      if (putter[2]) {
        unsafeCompleteDeferred(putter[1], true)
      }
      unsafeCompleteDeferred(taker, putter[0])
    }
  }

  shutdown(): Effect.Effect<never, never, void> {
    return pipe(
      core.fiberId,
      core.flatMap((fiberId) =>
        pipe(
          core.sync(() => unsafePollAll(this.putters)),
          core.flatMap((putters) =>
            fiberRuntime.forEachParUnboundedDiscard(putters, ([_, deferred, isLastItem]) =>
              isLastItem ?
                pipe(
                  core.deferredInterruptWith(deferred, fiberId),
                  core.asUnit
                ) :
                core.unit, false)
          )
        )
      )
    )
  }

  handleSurplus(
    iterable: Iterable<A>,
    queue: Queue.BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.withFiberRuntime<never, never, boolean>((state) => {
      const deferred = core.deferredUnsafeMake<never, boolean>(state.id())
      return pipe(
        core.suspend(() => {
          this.unsafeOffer(iterable, deferred)
          this.unsafeOnQueueEmptySpace(queue, takers)
          unsafeCompleteTakers(this, queue, takers)
          return MutableRef.get(isShutdown) ? core.interrupt : core.deferredAwait(deferred)
        }),
        core.onInterrupt(() => core.sync(() => this.unsafeRemove(deferred)))
      )
    })
  }

  unsafeOnQueueEmptySpace(
    queue: Queue.BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    let keepPolling = true
    while (keepPolling && (queue.capacity() === Number.POSITIVE_INFINITY || queue.length() < queue.capacity())) {
      const putter = pipe(this.putters, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (putter === MutableQueue.EmptyMutableQueue) {
        keepPolling = false
      } else {
        const offered = queue.offer(putter[0])
        if (offered && putter[2]) {
          unsafeCompleteDeferred(putter[1], true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, pipe(unsafePollAll(this.putters), Chunk.prepend(putter)))
        }
        unsafeCompleteTakers(this, queue, takers)
      }
    }
  }

  unsafeOffer(iterable: Iterable<A>, deferred: Deferred.Deferred<never, boolean>): void {
    const stuff = Array.from(iterable)
    for (let i = 0; i < stuff.length; i++) {
      const value = stuff[i]
      if (i === stuff.length - 1) {
        pipe(this.putters, MutableQueue.offer([value, deferred, true as boolean] as const))
      } else {
        pipe(this.putters, MutableQueue.offer([value, deferred, false as boolean] as const))
      }
    }
  }

  unsafeRemove(deferred: Deferred.Deferred<never, boolean>): void {
    unsafeOfferAll(
      this.putters,
      pipe(unsafePollAll(this.putters), Chunk.filter(([, _]) => _ !== deferred))
    )
  }
}

/** @internal */
class DroppingStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  surplusSize(): number {
    return 0
  }

  shutdown(): Effect.Effect<never, never, void> {
    return core.unit
  }

  onCompleteTakersWithEmptyQueue(): void {
  }

  handleSurplus(
    _iterable: Iterable<A>,
    _queue: Queue.BackingQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.succeed(false)
  }

  unsafeOnQueueEmptySpace(
    _queue: Queue.BackingQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    //
  }
}

/** @internal */
class SlidingStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  surplusSize(): number {
    return 0
  }

  shutdown(): Effect.Effect<never, never, void> {
    return core.unit
  }

  onCompleteTakersWithEmptyQueue(): void {
  }

  handleSurplus(
    iterable: Iterable<A>,
    queue: Queue.BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.sync(() => {
      this.unsafeOffer(queue, iterable)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(
    _queue: Queue.BackingQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    //
  }

  unsafeOffer(queue: Queue.BackingQueue<A>, iterable: Iterable<A>): void {
    const iterator = iterable[Symbol.iterator]()
    let next: IteratorResult<A>
    let offering = true
    while (!(next = iterator.next()).done && offering) {
      if (queue.capacity() === 0) {
        return
      }
      // Poll 1 and retry
      queue.poll(MutableQueue.EmptyMutableQueue)
      offering = queue.offer(next.value)
    }
  }
}

/** @internal */
const unsafeCompleteDeferred = <A>(deferred: Deferred.Deferred<never, A>, a: A): void => {
  return core.deferredUnsafeDone(deferred, core.succeed(a))
}

/** @internal */
const unsafeOfferAll = <A>(queue: MutableQueue.MutableQueue<A>, as: Iterable<A>): Chunk.Chunk<A> => {
  return pipe(queue, MutableQueue.offerAll(as))
}

/** @internal */
const unsafePollAll = <A>(queue: MutableQueue.MutableQueue<A>): Chunk.Chunk<A> => {
  return pipe(queue, MutableQueue.pollUpTo(Number.POSITIVE_INFINITY))
}

/** @internal */
const unsafePollN = <A>(queue: MutableQueue.MutableQueue<A>, max: number): Chunk.Chunk<A> => {
  return pipe(queue, MutableQueue.pollUpTo(max))
}

/** @internal */
export const unsafeRemove = <A>(queue: MutableQueue.MutableQueue<A>, a: A): void => {
  unsafeOfferAll(
    queue,
    pipe(unsafePollAll(queue), Chunk.filter((b) => a !== b))
  )
}

/** @internal */
export const unsafeCompleteTakers = <A>(
  strategy: Queue.Strategy<A>,
  queue: Queue.BackingQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
): void => {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true
  while (keepPolling && queue.length() !== 0) {
    const taker = pipe(takers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (taker !== MutableQueue.EmptyMutableQueue) {
      const element = queue.poll(MutableQueue.EmptyMutableQueue)
      if (element !== MutableQueue.EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue, takers)
      } else {
        unsafeOfferAll(takers, pipe(unsafePollAll(takers), Chunk.prepend(taker)))
      }
      keepPolling = true
    } else {
      keepPolling = false
    }
  }
  if (keepPolling && queue.length() === 0 && !MutableQueue.isEmpty(takers)) {
    strategy.onCompleteTakersWithEmptyQueue(takers)
  }
}

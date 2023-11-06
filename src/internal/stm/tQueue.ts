import * as Chunk from "../../Chunk.js"
import { dual, pipe } from "../../Function.js"
import * as Option from "../../Option.js"
import { hasProperty, type Predicate } from "../../Predicate.js"
import * as RA from "../../ReadonlyArray.js"
import * as STM from "../../STM.js"
import type * as TQueue from "../../TQueue.js"
import type * as TRef from "../../TRef.js"
import * as core from "./core.js"
import * as OpCodes from "./opCodes/strategy.js"
import * as stm from "./stm.js"
import * as tRef from "./tRef.js"

const TEnqueueSymbolKey = "effect/TQueue/TEnqueue"

/** @internal */
export const TEnqueueTypeId: TQueue.TEnqueueTypeId = Symbol.for(TEnqueueSymbolKey) as TQueue.TEnqueueTypeId

const TDequeueSymbolKey = "effect/TQueue/TDequeue"

/** @internal */
export const TDequeueTypeId: TQueue.TDequeueTypeId = Symbol.for(TDequeueSymbolKey) as TQueue.TDequeueTypeId

/**
 * A `Strategy` describes how the queue will handle values if the queue is at
 * capacity.
 *
 * @internal
 */
export type TQueueStrategy = BackPressure | Dropping | Sliding

/**
 * A strategy that retries if the queue is at capacity.
 *
 * @internal
 */
export interface BackPressure {
  readonly _tag: OpCodes.OP_BACKPRESSURE_STRATEGY
}

/**
 * A strategy that drops new values if the queue is at capacity.
 *
 * @internal
 */
export interface Dropping {
  readonly _tag: OpCodes.OP_DROPPING_STRATEGY
}

/**
 * A strategy that drops old values if the queue is at capacity.
 *
 * @internal
 */
export interface Sliding {
  readonly _tag: OpCodes.OP_SLIDING_STRATEGY
}

/** @internal */
export const BackPressure: TQueueStrategy = {
  _tag: OpCodes.OP_BACKPRESSURE_STRATEGY
}

/** @internal */
export const Dropping: TQueueStrategy = {
  _tag: OpCodes.OP_DROPPING_STRATEGY
}

/** @internal */
export const Sliding: TQueueStrategy = {
  _tag: OpCodes.OP_SLIDING_STRATEGY
}

/** @internal */
export const tDequeueVariance = {
  _Out: (_: never) => _
}

/** @internal */
export const tEnqueueVariance = {
  _In: (_: unknown) => _
}

class TQueueImpl<A> implements TQueue.TQueue<A> {
  readonly [TDequeueTypeId] = tDequeueVariance
  readonly [TEnqueueTypeId] = tEnqueueVariance
  constructor(
    readonly ref: TRef.TRef<Array<A> | undefined>,
    readonly requestedCapacity: number,
    readonly strategy: TQueueStrategy
  ) {}

  capacity(): number {
    return this.requestedCapacity
  }

  size: STM.STM<never, never, number> = core.withSTMRuntime((runtime) => {
    const queue = tRef.unsafeGet(this.ref, runtime.journal)
    if (queue === undefined) {
      return STM.interruptAs(runtime.fiberId)
    }
    return core.succeed(queue.length)
  })

  isFull: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === this.requestedCapacity)

  isEmpty: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === 0)

  shutdown: STM.STM<never, never, void> = core.withSTMRuntime<never, never, void>((runtime) => {
    tRef.unsafeSet(this.ref, void 0, runtime.journal)
    return stm.unit
  })

  isShutdown: STM.STM<never, never, boolean> = core.effect<never, boolean>((journal) => {
    const queue = tRef.unsafeGet(this.ref, journal)
    return queue === undefined
  })

  awaitShutdown: STM.STM<never, never, void> = core.flatMap(
    this.isShutdown,
    (isShutdown) => isShutdown ? stm.unit : core.retry
  )

  offer(value: A): STM.STM<never, never, boolean> {
    return core.withSTMRuntime((runtime) => {
      const queue = pipe(this.ref, tRef.unsafeGet(runtime.journal))
      if (queue === undefined) {
        return core.interruptAs(runtime.fiberId)
      }
      if (queue.length < this.requestedCapacity) {
        queue.push(value)
        tRef.unsafeSet(this.ref, queue, runtime.journal)
        return core.succeed(true)
      }
      switch (this.strategy._tag) {
        case OpCodes.OP_BACKPRESSURE_STRATEGY: {
          return core.retry
        }
        case OpCodes.OP_DROPPING_STRATEGY: {
          return core.succeed(false)
        }
        case OpCodes.OP_SLIDING_STRATEGY: {
          const dequeued = queue.shift()
          if (dequeued === undefined) {
            return core.succeed(true)
          }
          queue.push(value)
          tRef.unsafeSet(this.ref, queue, runtime.journal)
          return core.succeed(true)
        }
      }
    })
  }

  offerAll(iterable: Iterable<A>): STM.STM<never, never, boolean> {
    return core.withSTMRuntime((runtime) => {
      const as = Array.from(iterable)
      const queue = tRef.unsafeGet(this.ref, runtime.journal)
      if (queue === undefined) {
        return core.interruptAs(runtime.fiberId)
      }
      if (queue.length + as.length <= this.requestedCapacity) {
        tRef.unsafeSet(this.ref, [...queue, ...as], runtime.journal)
        return core.succeed(true)
      }
      switch (this.strategy._tag) {
        case OpCodes.OP_BACKPRESSURE_STRATEGY: {
          return core.retry
        }
        case OpCodes.OP_DROPPING_STRATEGY: {
          const forQueue = as.slice(0, this.requestedCapacity - queue.length)
          tRef.unsafeSet(this.ref, [...queue, ...forQueue], runtime.journal)
          return core.succeed(false)
        }
        case OpCodes.OP_SLIDING_STRATEGY: {
          const forQueue = as.slice(0, this.requestedCapacity - queue.length)
          const toDrop = queue.length + forQueue.length - this.requestedCapacity
          const newQueue = queue.slice(toDrop)
          tRef.unsafeSet(this.ref, [...newQueue, ...forQueue], runtime.journal)
          return core.succeed(true)
        }
      }
    })
  }

  peek: STM.STM<never, never, A> = core.withSTMRuntime((runtime) => {
    const queue = tRef.unsafeGet(this.ref, runtime.journal)
    if (queue === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    const head = queue[0]
    if (head === undefined) {
      return core.retry
    }
    return core.succeed(head)
  })

  peekOption: STM.STM<never, never, Option.Option<A>> = core.withSTMRuntime((runtime) => {
    const queue = tRef.unsafeGet(this.ref, runtime.journal)
    if (queue === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    return core.succeed(Option.fromNullable(queue[0]))
  })

  take: STM.STM<never, never, A> = core.withSTMRuntime((runtime) => {
    const queue = tRef.unsafeGet(this.ref, runtime.journal)
    if (queue === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    const dequeued = queue.shift()
    if (dequeued === undefined) {
      return core.retry
    }
    tRef.unsafeSet(this.ref, queue, runtime.journal)
    return core.succeed(dequeued)
  })

  takeAll: STM.STM<never, never, Array<A>> = core.withSTMRuntime((runtime) => {
    const queue = tRef.unsafeGet(this.ref, runtime.journal)
    if (queue === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    tRef.unsafeSet(this.ref, [], runtime.journal)
    return core.succeed(queue)
  })

  takeUpTo(max: number): STM.STM<never, never, Array<A>> {
    return core.withSTMRuntime((runtime) => {
      const queue = tRef.unsafeGet(this.ref, runtime.journal)
      if (queue === undefined) {
        return core.interruptAs(runtime.fiberId)
      }
      const [toTake, remaining] = Chunk.splitAt(Chunk.unsafeFromArray(queue), max)
      tRef.unsafeSet<Array<A> | undefined>(this.ref, Array.from(remaining), runtime.journal)
      return core.succeed(Array.from(toTake))
    })
  }
}

/** @internal */
export const isTQueue = (u: unknown): u is TQueue.TQueue<unknown> => {
  return isTEnqueue(u) && isTDequeue(u)
}

/** @internal */
export const isTEnqueue = (u: unknown): u is TQueue.TEnqueue<unknown> => hasProperty(u, TEnqueueTypeId)

/** @internal */
export const isTDequeue = (u: unknown): u is TQueue.TDequeue<unknown> => hasProperty(u, TDequeueTypeId)

/** @internal */
export const awaitShutdown = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, void> =>
  self.awaitShutdown

/** @internal */
export const bounded = <A>(requestedCapacity: number): STM.STM<never, never, TQueue.TQueue<A>> =>
  makeQueue<A>(requestedCapacity, BackPressure)

/** @internal */
export const capacity = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): number => {
  return self.capacity()
}

/** @internal */
export const dropping = <A>(requestedCapacity: number): STM.STM<never, never, TQueue.TQueue<A>> =>
  makeQueue<A>(requestedCapacity, Dropping)

/** @internal */
export const isEmpty = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, boolean> =>
  self.isEmpty

/** @internal */
export const isFull = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, boolean> => self.isFull

/** @internal */
export const isShutdown = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, boolean> =>
  self.isShutdown

/** @internal */
export const offer = dual<
  <A>(value: A) => (self: TQueue.TEnqueue<A>) => STM.STM<never, never, void>,
  <A>(self: TQueue.TEnqueue<A>, value: A) => STM.STM<never, never, void>
>(2, (self, value) => self.offer(value))

/** @internal */
export const offerAll = dual<
  <A>(iterable: Iterable<A>) => (self: TQueue.TEnqueue<A>) => STM.STM<never, never, boolean>,
  <A>(self: TQueue.TEnqueue<A>, iterable: Iterable<A>) => STM.STM<never, never, boolean>
>(2, (self, iterable) => self.offerAll(iterable))

/** @internal */
export const peek = <A>(self: TQueue.TDequeue<A>): STM.STM<never, never, A> => self.peek

/** @internal */
export const peekOption = <A>(self: TQueue.TDequeue<A>): STM.STM<never, never, Option.Option<A>> => self.peekOption

/** @internal */
export const poll = <A>(self: TQueue.TDequeue<A>): STM.STM<never, never, Option.Option<A>> =>
  pipe(self.takeUpTo(1), core.map(RA.head))

/** @internal */
export const seek = dual<
  <A>(predicate: Predicate<A>) => (self: TQueue.TDequeue<A>) => STM.STM<never, never, A>,
  <A>(self: TQueue.TDequeue<A>, predicate: Predicate<A>) => STM.STM<never, never, A>
>(2, (self, predicate) => seekLoop(self, predicate))

const seekLoop = <A>(self: TQueue.TDequeue<A>, predicate: Predicate<A>): STM.STM<never, never, A> =>
  core.flatMap(
    self.take,
    (a) => predicate(a) ? core.succeed(a) : seekLoop(self, predicate)
  )

/** @internal */
export const shutdown = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, void> => self.shutdown

/** @internal */
export const size = <A>(self: TQueue.TDequeue<A> | TQueue.TEnqueue<A>): STM.STM<never, never, number> => self.size

/** @internal */
export const sliding = <A>(requestedCapacity: number): STM.STM<never, never, TQueue.TQueue<A>> =>
  makeQueue<A>(requestedCapacity, Sliding)

/** @internal */
export const take = <A>(self: TQueue.TDequeue<A>): STM.STM<never, never, A> => self.take

/** @internal */
export const takeAll = <A>(self: TQueue.TDequeue<A>): STM.STM<never, never, Array<A>> => self.takeAll

/** @internal */
export const takeBetween = dual<
  (min: number, max: number) => <A>(self: TQueue.TDequeue<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TQueue.TDequeue<A>, min: number, max: number) => STM.STM<never, never, Array<A>>
>(
  3,
  <A>(self: TQueue.TDequeue<A>, min: number, max: number): STM.STM<never, never, Array<A>> =>
    stm.suspend(() => {
      const takeRemainder = (
        min: number,
        max: number,
        acc: Chunk.Chunk<A>
      ): STM.STM<never, never, Chunk.Chunk<A>> => {
        if (max < min) {
          return core.succeed(acc)
        }
        return pipe(
          self.takeUpTo(max),
          core.flatMap((taken) => {
            const remaining = min - taken.length
            if (remaining === 1) {
              return pipe(
                self.take,
                core.map((a) => pipe(acc, Chunk.appendAll(Chunk.unsafeFromArray(taken)), Chunk.append(a)))
              )
            }
            if (remaining > 1) {
              return pipe(
                self.take,
                core.flatMap((a) =>
                  takeRemainder(
                    remaining - 1,
                    max - taken.length - 1,
                    pipe(acc, Chunk.appendAll(Chunk.unsafeFromArray(taken)), Chunk.append(a))
                  )
                )
              )
            }
            return core.succeed(pipe(acc, Chunk.appendAll(Chunk.unsafeFromArray(taken))))
          })
        )
      }
      return core.map(takeRemainder(min, max, Chunk.empty<A>()), (c) => Array.from(c))
    })
)

/** @internal */
export const takeN = dual<
  (n: number) => <A>(self: TQueue.TDequeue<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TQueue.TDequeue<A>, n: number) => STM.STM<never, never, Array<A>>
>(2, (self, n) => pipe(self, takeBetween(n, n)))

/** @internal */
export const takeUpTo = dual<
  (max: number) => <A>(self: TQueue.TDequeue<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TQueue.TDequeue<A>, max: number) => STM.STM<never, never, Array<A>>
>(2, (self, max) => self.takeUpTo(max))

/** @internal */
export const unbounded = <A>(): STM.STM<never, never, TQueue.TQueue<A>> =>
  makeQueue<A>(Number.MAX_SAFE_INTEGER, Dropping)

const makeQueue = <A>(requestedCapacity: number, strategy: TQueueStrategy): STM.STM<never, never, TQueue.TQueue<A>> =>
  core.map(
    tRef.make<Array<A>>([]),
    (ref) => new TQueueImpl(ref, requestedCapacity, strategy)
  )

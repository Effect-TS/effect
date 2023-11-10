import * as it from "effect-test/utils/extend"
import type { Chunk } from "effect/Chunk"
import { Deferred } from "effect/Deferred"
import { Effect } from "effect/Effect"
import { Exit } from "effect/Exit"
import { Fiber } from "effect/Fiber"
import { pipe } from "effect/Function"
import * as internalQueue from "effect/internal/queue"
import type { MutableQueue } from "effect/MutableQueue"
import type { MutableRef } from "effect/MutableRef"
import type { Option } from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import { PubSub } from "effect/PubSub"
import { Queue } from "effect/Queue"
import { Sink } from "effect/Sink"
import { Stream } from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("drain - fails if upstream fails", () =>
    Effect.gen(function*($) {
      const stream = pipe(
        Stream.make(1),
        Stream.mapEffect(() => Effect.fail("boom!"))
      )
      const result = yield* $(stream, Stream.run(Sink.drain), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail("boom!"))
    }))

  it.effect("fromEffect", () =>
    Effect.gen(function*($) {
      const sink = Sink.fromEffect(Effect.succeed("ok"))
      const result = yield* $(Stream.make(1, 2, 3), Stream.run(sink))
      assert.deepStrictEqual(result, "ok")
    }))

  it.effect("fromQueue - should enqueue all elements", () =>
    Effect.gen(function*($) {
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(Stream.make(1, 2, 3), Stream.run(Sink.fromQueue(queue)))
      const result = yield* $(Queue.takeAll(queue))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("fromQueueWithShutdown - should enqueue all elements and shutdown the queue", () =>
    Effect.gen(function*($) {
      const queue = yield* $(Queue.unbounded<number>(), Effect.map(createQueueSpy))
      yield* $(Stream.make(1, 2, 3), Stream.run(Sink.fromQueue(queue, { shutdown: true })))
      const enqueuedValues = yield* $(Queue.takeAll(queue))
      const isShutdown = yield* $(Queue.isShutdown(queue))
      assert.deepStrictEqual(Array.from(enqueuedValues), [1, 2, 3])
      assert.isTrue(isShutdown)
    }))

  it.effect("fromPubSub - should publish all elements", () =>
    Effect.gen(function*($) {
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const pubsub = yield* $(PubSub.unbounded<number>())
      const fiber = yield* $(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed<never, void>(deferred1, void 0),
            Effect.zipRight(Deferred.await(deferred2)),
            Effect.zipRight(Queue.takeAll(subscription))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* $(Deferred.await(deferred1))
      yield* $(Stream.make(1, 2, 3), Stream.run(Sink.fromPubSub(pubsub)))
      yield* $(Deferred.succeed<never, void>(deferred2, void 0))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("fromPubSub(_, { shutdown: true }) - should shutdown the pubsub", () =>
    Effect.gen(function*($) {
      const pubsub = yield* $(PubSub.unbounded<number>())
      yield* $(Stream.make(1, 2, 3), Stream.run(Sink.fromPubSub(pubsub, { shutdown: true })))
      const isShutdown = yield* $(PubSub.isShutdown(pubsub))
      assert.isTrue(isShutdown)
    }))
})

const createQueueSpy = <A>(queue: Queue<A>): Queue<A> => new QueueSpy(queue)

class QueueSpy<A> implements Queue<A> {
  readonly [Queue.DequeueTypeId] = internalQueue.dequeueVariance
  readonly [Queue.EnqueueTypeId] = internalQueue.enqueueVariance
  private isShutdownInternal = false
  readonly queue: Queue.BackingQueue<A>
  readonly shutdownFlag: MutableRef<boolean>
  readonly shutdownHook: Deferred<never, void>
  readonly strategy: Queue.Strategy<A>
  readonly takers: MutableQueue<Deferred<never, A>>

  constructor(readonly backingQueue: Queue<A>) {
    this.queue = backingQueue.queue
    this.shutdownFlag = backingQueue.shutdownFlag
    this.shutdownHook = backingQueue.shutdownHook
    this.strategy = backingQueue.strategy
    this.takers = backingQueue.takers
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  unsafeOffer(value: A): boolean {
    return Queue.unsafeOffer(this.backingQueue, value)
  }

  offer(a: A) {
    return Queue.offer(this.backingQueue, a)
  }

  offerAll(elements: Iterable<A>) {
    return Queue.offerAll(this.backingQueue, elements)
  }

  capacity(): number {
    return Queue.capacity(this.backingQueue)
  }

  size(): Effect<never, never, number> {
    return Queue.size(this.backingQueue)
  }

  unsafeSize(): Option<number> {
    return this.backingQueue.unsafeSize()
  }

  awaitShutdown(): Effect<never, never, void> {
    return Queue.awaitShutdown(this.backingQueue)
  }

  isActive(): boolean {
    return !this.isShutdownInternal
  }

  isShutdown(): Effect<never, never, boolean> {
    return Effect.sync(() => this.isShutdownInternal)
  }

  shutdown(): Effect<never, never, void> {
    return Effect.sync(() => {
      this.isShutdownInternal = true
    })
  }

  isFull(): Effect<never, never, boolean> {
    return Queue.isFull(this.backingQueue)
  }

  isEmpty(): Effect<never, never, boolean> {
    return Queue.isEmpty(this.backingQueue)
  }

  take(): Effect<never, never, A> {
    return Queue.take(this.backingQueue)
  }

  takeAll(): Effect<never, never, Chunk<A>> {
    return Queue.takeAll(this.backingQueue)
  }

  takeUpTo(max: number): Effect<never, never, Chunk<A>> {
    return Queue.takeUpTo(this.backingQueue, max)
  }

  takeBetween(min: number, max: number): Effect<never, never, Chunk<A>> {
    return Queue.takeBetween(this.backingQueue, min, max)
  }

  takeN(n: number): Effect<never, never, Chunk<A>> {
    return Queue.takeN(this.backingQueue, n)
  }

  poll(): Effect<never, never, Option<A>> {
    return Queue.poll(this.backingQueue)
  }
}

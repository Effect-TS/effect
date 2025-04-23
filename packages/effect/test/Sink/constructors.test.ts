import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import type * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import type * as MutableQueue from "effect/MutableQueue"
import type * as MutableRef from "effect/MutableRef"
import type * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as internalQueue from "../../src/internal/queue.js"

describe("Sink", () => {
  it.effect("drain - fails if upstream fails", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.make(1),
        Stream.mapEffect(() => Effect.fail("boom!"))
      )
      const result = yield* pipe(stream, Stream.run(Sink.drain), Effect.exit)
      deepStrictEqual(result, Exit.fail("boom!"))
    }))

  it.effect("fromEffect", () =>
    Effect.gen(function*() {
      const sink = Sink.fromEffect(Effect.succeed("ok"))
      const result = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink))
      deepStrictEqual(result, "ok")
    }))

  it.effect("fromQueue - should enqueue all elements", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<number>())
      yield* pipe(Stream.make(1, 2, 3), Stream.run(Sink.fromQueue(queue)))
      const result = yield* (Queue.takeAll(queue))
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("fromQueueWithShutdown - should enqueue all elements and shutdown the queue", () =>
    Effect.gen(function*() {
      const queue = yield* pipe(Queue.unbounded<number>(), Effect.map(createQueueSpy))
      yield* pipe(Stream.make(1, 2, 3), Stream.run(Sink.fromQueue(queue, { shutdown: true })))
      const enqueuedValues = yield* (Queue.takeAll(queue))
      const isShutdown = yield* (Queue.isShutdown(queue))
      deepStrictEqual(Array.from(enqueuedValues), [1, 2, 3])
      assertTrue(isShutdown)
    }))

  it.effect("fromPubSub - should publish all elements", () =>
    Effect.gen(function*() {
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const pubsub = yield* (PubSub.unbounded<number>())
      const fiber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(Deferred.await(deferred2)),
            Effect.zipRight(Queue.takeAll(subscription))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* (Deferred.await(deferred1))
      yield* pipe(Stream.make(1, 2, 3), Stream.run(Sink.fromPubSub(pubsub)))
      yield* (Deferred.succeed(deferred2, void 0))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("fromPubSub(_, { shutdown: true }) - should shutdown the pubsub", () =>
    Effect.gen(function*() {
      const pubsub = yield* (PubSub.unbounded<number>())
      yield* pipe(Stream.make(1, 2, 3), Stream.run(Sink.fromPubSub(pubsub, { shutdown: true })))
      const isShutdown = yield* (PubSub.isShutdown(pubsub))
      assertTrue(isShutdown)
    }))
})

const createQueueSpy = <A>(queue: Queue.Queue<A>): Queue.Queue<A> => new QueueSpy(queue)

class QueueSpy<A> extends Effectable.Class<A> implements Queue.Queue<A> {
  readonly [Queue.DequeueTypeId] = internalQueue.dequeueVariance
  readonly [Queue.EnqueueTypeId] = internalQueue.enqueueVariance
  private isShutdownInternal = false
  readonly queue: Queue.BackingQueue<A>
  readonly shutdownFlag: MutableRef.MutableRef<boolean>
  readonly shutdownHook: Deferred.Deferred<void, never>
  readonly strategy: Queue.Strategy<A>
  readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<A, never>>

  constructor(readonly backingQueue: Queue.Queue<A>) {
    super()
    this.queue = backingQueue.queue
    this.shutdownFlag = backingQueue.shutdownFlag
    this.shutdownHook = backingQueue.shutdownHook
    this.strategy = backingQueue.strategy
    this.takers = backingQueue.takers
  }

  commit() {
    return this.take
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

  get size(): Effect.Effect<number> {
    return Queue.size(this.backingQueue)
  }

  unsafeSize(): Option.Option<number> {
    return this.backingQueue.unsafeSize()
  }

  get awaitShutdown(): Effect.Effect<void> {
    return Queue.awaitShutdown(this.backingQueue)
  }

  isActive(): boolean {
    return !this.isShutdownInternal
  }

  get isShutdown(): Effect.Effect<boolean> {
    return Effect.sync(() => this.isShutdownInternal)
  }

  get shutdown(): Effect.Effect<void> {
    return Effect.sync(() => {
      this.isShutdownInternal = true
    })
  }

  get isFull(): Effect.Effect<boolean> {
    return Queue.isFull(this.backingQueue)
  }

  get isEmpty(): Effect.Effect<boolean> {
    return Queue.isEmpty(this.backingQueue)
  }

  get take(): Effect.Effect<A> {
    return Queue.take(this.backingQueue)
  }

  get takeAll(): Effect.Effect<Chunk.Chunk<A>> {
    return Queue.takeAll(this.backingQueue)
  }

  takeUpTo(max: number): Effect.Effect<Chunk.Chunk<A>> {
    return Queue.takeUpTo(this.backingQueue, max)
  }

  takeBetween(min: number, max: number): Effect.Effect<Chunk.Chunk<A>> {
    return Queue.takeBetween(this.backingQueue, min, max)
  }

  takeN(n: number): Effect.Effect<Chunk.Chunk<A>> {
    return Queue.takeN(this.backingQueue, n)
  }

  poll(): Effect.Effect<Option.Option<A>> {
    return Queue.poll(this.backingQueue)
  }
}

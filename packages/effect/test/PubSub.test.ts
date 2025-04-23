import { describe, it } from "@effect/vitest"
import { assertSome, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Array, Chunk, Deferred, Effect, Fiber, pipe, PubSub, Queue } from "effect"

describe("PubSub", () => {
  it.effect("publishAll - capacity 2 (BoundedPubSubPow2)", () => {
    const messages = [1, 2]
    return PubSub.bounded<number>(2).pipe(
      Effect.flatMap((pubsub) =>
        Effect.scoped(
          Effect.gen(function*() {
            const dequeue1 = yield* (PubSub.subscribe(pubsub))
            const dequeue2 = yield* (PubSub.subscribe(pubsub))
            yield* (PubSub.publishAll(pubsub, messages))
            const takes1 = yield* (Queue.takeAll(dequeue1))
            const takes2 = yield* (Queue.takeAll(dequeue2))
            deepStrictEqual([...takes1], messages)
            deepStrictEqual([...takes2], messages)
          })
        )
      )
    )
  })
  it.effect("publishAll - capacity 4 (BoundedPubSubPow2)", () => {
    const messages = [1, 2]
    return PubSub.bounded<number>(4).pipe(
      Effect.flatMap((pubsub) =>
        Effect.scoped(
          Effect.gen(function*() {
            const dequeue1 = yield* (PubSub.subscribe(pubsub))
            const dequeue2 = yield* (PubSub.subscribe(pubsub))
            yield* (PubSub.publishAll(pubsub, messages))
            const takes1 = yield* (Queue.takeAll(dequeue1))
            const takes2 = yield* (Queue.takeAll(dequeue2))
            deepStrictEqual([...takes1], messages)
            deepStrictEqual([...takes2], messages)
          })
        )
      )
    )
  })
  it.effect("publishAll - capacity 3 (BoundedPubSubArb)", () => {
    const messages = [1, 2]
    return PubSub.bounded<number>(3).pipe(
      Effect.flatMap((pubsub) =>
        Effect.scoped(
          Effect.gen(function*() {
            const dequeue1 = yield* (PubSub.subscribe(pubsub))
            const dequeue2 = yield* (PubSub.subscribe(pubsub))
            yield* (PubSub.publishAll(pubsub, messages))
            const takes1 = yield* (Queue.takeAll(dequeue1))
            const takes2 = yield* (Queue.takeAll(dequeue2))
            deepStrictEqual([...takes1], messages)
            deepStrictEqual([...takes2], messages)
          })
        )
      )
    )
  })
  it.effect("sequential publishers and subscribers with one publisher and one subscriber", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 9)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.bounded<number>(10)
      const subscriber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(Deferred.await(deferred2)),
            Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* pipe(values, Effect.forEach((n) => PubSub.publish(pubsub, n)))
      yield* Deferred.succeed(deferred2, void 0)
      const result = yield* Fiber.join(subscriber)
      deepStrictEqual(result, values)
    }))
  it.effect("sequential publishers and subscribers with one publisher and two subscribers", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 9)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const deferred3 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.bounded<number>(10)
      const subscriber1 = yield* pubsub.pipe(
        PubSub.subscribe,
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(Deferred.await(deferred3)),
            Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pubsub.pipe(
        PubSub.subscribe,
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(Deferred.await(deferred3)),
            Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(values, Effect.forEach((n) => PubSub.publish(pubsub, n)))
      yield* Deferred.succeed(deferred3, undefined)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      deepStrictEqual(result1, values)
      deepStrictEqual(result2, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.bounded<number>(64)
      const subscriber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result = yield* Fiber.join(subscriber)
      deepStrictEqual(result, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.bounded<number>(64)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      deepStrictEqual(result1, values)
      deepStrictEqual(result2, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*() {
      const values = Array.range(1, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.bounded<number>(64 * 2)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      const fiber = yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      yield* pipe(values, Array.map((n) => -n), Effect.forEach((n) => PubSub.publish(pubsub, n)), Effect.fork)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      yield* Fiber.join(fiber)
      deepStrictEqual(pipe(result1, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result1, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
      deepStrictEqual(pipe(result2, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result2, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
    }))
  it.effect("dropping concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.dropping<number>(64)
      const subscriber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result = yield* Fiber.join(subscriber)
      deepStrictEqual(result, values)
    }))
  it.effect("dropping concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.dropping<number>(64)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      deepStrictEqual(result1, values)
      deepStrictEqual(result2, values)
    }))
  it.effect("dropping concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*() {
      const values = Array.range(1, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.dropping<number>(64 * 2)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      const fiber = yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      yield* pipe(values, Array.map((n) => -n), Effect.forEach((n) => PubSub.publish(pubsub, n)), Effect.fork)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      yield* Fiber.join(fiber)
      deepStrictEqual(pipe(result1, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result1, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
      deepStrictEqual(pipe(result2, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result2, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
    }))
  it.effect("sliding concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.sliding<number>(64)
      const subscriber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result = yield* Fiber.join(subscriber)
      deepStrictEqual(result, values)
    }))
  it.effect("sliding concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.sliding<number>(64)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      deepStrictEqual(result1, values)
      deepStrictEqual(result2, values)
    }))
  it.effect("sliding concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*() {
      const values = Array.range(1, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.sliding<number>(64 * 2)
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      const fiber = yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      yield* pipe(values, Array.map((n) => -n), Effect.forEach((n) => PubSub.publish(pubsub, n)), Effect.fork)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      yield* Fiber.join(fiber)
      deepStrictEqual(pipe(result1, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result1, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
      deepStrictEqual(pipe(result2, Array.filter((n) => n > 0)), values)
      deepStrictEqual(
        pipe(result2, Array.filter((n) => n < 0)),
        pipe(values, Array.map((n) => -n))
      )
    }))
  it.effect("unbounded concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.unbounded<number>()
      const subscriber = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )

      const result = yield* Fiber.join(subscriber)
      deepStrictEqual(result, values)
    }))
  it.effect("unbounded concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*() {
      const values = Array.range(0, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.unbounded<number>()
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      deepStrictEqual(result1, values)
      deepStrictEqual(result2, values)
    }))
  it.effect("unbounded concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*() {
      const values = Array.range(1, 64)
      const deferred1 = yield* Deferred.make<void>()
      const deferred2 = yield* Deferred.make<void>()
      const pubsub = yield* PubSub.unbounded<number>()
      const subscriber1 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )

      const subscriber2 = yield* pipe(
        PubSub.subscribe(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Array.appendAll(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      const fiber = yield* pipe(
        values,
        Effect.forEach((n) => PubSub.publish(pubsub, n)),
        Effect.fork
      )
      yield* pipe(values, Array.map((n) => -n), Effect.forEach((n) => PubSub.publish(pubsub, n)), Effect.fork)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      yield* Fiber.join(fiber)
      deepStrictEqual(Array.filter(result1, (n) => n > 0), values)
      deepStrictEqual(
        Array.filter(result1, (n) => n < 0),
        Array.map(values, (n) => -n)
      )
      deepStrictEqual(Array.filter(result2, (n) => n > 0), values)
      deepStrictEqual(
        Array.filter(result2, (n) => n < 0),
        Array.map(values, (n) => -n)
      )
    }))
  it.effect("null values", () => {
    const messages = [1, null]
    return PubSub.unbounded<number | null>().pipe(
      Effect.flatMap((pubsub) =>
        Effect.scoped(
          Effect.gen(function*() {
            const dequeue1 = yield* PubSub.subscribe(pubsub)
            const dequeue2 = yield* PubSub.subscribe(pubsub)
            yield* PubSub.publishAll(pubsub, messages)
            const takes1 = yield* Queue.takeAll(dequeue1)
            const takes2 = yield* Queue.takeAll(dequeue2)
            deepStrictEqual([...takes1], messages)
            deepStrictEqual([...takes2], messages)
          })
        )
      )
    )
  })

  it.scoped("publish does not increase size while no subscribers", () =>
    Effect.gen(function*() {
      const pubsub = yield* PubSub.dropping<number>(2)
      yield* PubSub.publish(pubsub, 1)
      yield* PubSub.publish(pubsub, 2)
      assertSome(pubsub.unsafeSize(), 0)
    }))

  it.scoped("publishAll does not increase size while no subscribers", () =>
    Effect.gen(function*() {
      const pubsub = yield* PubSub.dropping<number>(2)
      yield* PubSub.publishAll(pubsub, [1, 2])
      assertSome(pubsub.unsafeSize(), 0)
    }))

  describe("replay", () => {
    it.scoped("unbounded", () =>
      Effect.gen(function*() {
        const messages = [1, 2, 3, 4, 5]
        const pubsub = yield* PubSub.unbounded<number>({ replay: 3 })
        yield* PubSub.publishAll(pubsub, messages)
        const sub = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [3, 4, 5])
      }))

    it.effect("unbounded takeUpTo", () => {
      const messages = [1, 2, 3, 4, 5]
      return PubSub.unbounded<number>({ replay: 3 }).pipe(
        Effect.flatMap((pubsub) =>
          Effect.scoped(
            Effect.gen(function*() {
              yield* PubSub.publishAll(pubsub, messages)

              const dequeue1 = yield* PubSub.subscribe(pubsub)
              yield* PubSub.publish(pubsub, 6)
              const dequeue2 = yield* PubSub.subscribe(pubsub)

              strictEqual(yield* Queue.size(dequeue1), 4)
              strictEqual(yield* Queue.size(dequeue2), 3)
              deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeUpTo(dequeue1, 2)), [3, 4])
              deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeUpTo(dequeue1, 2)), [5, 6])
              deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeUpTo(dequeue2, 3)), [4, 5, 6])
            })
          )
        )
      )
    })

    it.scoped("dropping", () =>
      Effect.gen(function*() {
        const messages = [1, 2, 3, 4, 5]
        const pubsub = yield* PubSub.dropping<number>({ capacity: 2, replay: 3 })

        yield* PubSub.publishAll(pubsub, messages)
        const sub = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [3, 4, 5])
        yield* PubSub.publishAll(pubsub, [6, 7])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [6, 7])

        const sub2 = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub2)), [5, 6, 7])

        yield* PubSub.publishAll(pubsub, [8, 9, 10, 11])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [8, 9])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub2)), [8, 9])

        const sub3 = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub3)), [7, 8, 9])
      }))

    it.scoped("sliding", () =>
      Effect.gen(function*() {
        const messages = [1, 2, 3, 4, 5]
        const pubsub = yield* PubSub.sliding<number>({ capacity: 4, replay: 3 })

        yield* PubSub.publishAll(pubsub, messages)
        const sub = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(yield* Queue.take(sub), 3)
        yield* PubSub.publishAll(pubsub, [6, 7, 8, 9, 10])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [5, 6, 7, 8, 9, 10])

        const sub2 = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub2)), [8, 9, 10])

        yield* PubSub.publishAll(pubsub, [11, 12, 13, 14, 15, 16])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [13, 14, 15, 16])
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub2)), [13, 14, 15, 16])

        const sub3 = yield* PubSub.subscribe(pubsub)
        deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub3)), [14, 15, 16])
      }))
  })
})

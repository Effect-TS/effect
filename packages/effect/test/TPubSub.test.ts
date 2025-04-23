import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import {
  Array as Arr,
  Deferred,
  Effect,
  FastCheck as fc,
  Fiber,
  Number as number,
  pipe,
  STM,
  TPubSub,
  TQueue
} from "effect"

const sort: (array: ReadonlyArray<number>) => ReadonlyArray<number> = Arr.sort(number.Order)

describe("TPubSub", () => {
  it("sequential publishers and subscribers - with one publisher and one subscriber", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred2)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n)))
        ))
        yield* (pipe(deferred2, Deferred.succeed<void>(void 0)))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it("sequential publishers and subscribers - with one publisher and two subscribers", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const deferred3 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n)))
        ))
        yield* (pipe(deferred3, Deferred.succeed<void>(void 0)))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1), as.slice(0, n))
      deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it("concurrent publishers and subscribers - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        yield* (Deferred.await(deferred))
        yield* (pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(Effect.scoped(program))
      deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it("concurrent publishers and subscribers - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(Effect.scoped(program))
      deepStrictEqual(Array.from(result1), as.slice(0, n))
      deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it("concurrent publishers and subscribers - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n * 2))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        yield* (pipe(
          as.slice(0, n).map((n) => n !== 0 ? -n : n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        as.slice(0, n)
      )
      deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n)
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        as.slice(0, n)
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n)
      )
    })))

  it("back pressure - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result), as)
    })))

  it("back pressure - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1), as)
      deepStrictEqual(Array.from(result2), as)
    })))

  it("back pressure - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.bounded<number>(n * 2))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as,
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        yield* (pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1).filter((n) => n > 0), as)
      deepStrictEqual(Array.from(result1).filter((n) => n < 0), as.map((n) => -n))
      deepStrictEqual(Array.from(result2).filter((n) => n > 0), as)
      deepStrictEqual(Array.from(result2).filter((n) => n < 0), as.map((n) => -n))
    })))

  it("dropping - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.dropping<number>(n))
        const subscriber = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it("dropping - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.dropping<number>(n))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1), as.slice(0, n))
      deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it("dropping - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.dropping<number>(n * 2))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as,
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        yield* (pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        as.slice(0, Array.from(result1).filter((n) => n > 0).length)
      )
      deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n).slice(0, Array.from(result1).filter((n) => n < 0).length)
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        as.slice(0, Array.from(result2).filter((n) => n > 0).length)
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n).slice(0, Array.from(result2).filter((n) => n < 0).length)
      )
    })))

  it("sliding - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.sliding<number>(n))
        const subscriber = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred))
        const publisher = yield* (pipe(sort(as), Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        yield* (Fiber.join(publisher))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result), sort(Array.from(result)))
    })))

  it("sliding - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.sliding<number>(n))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(sort(as), Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1), sort(Array.from(result1)))
      deepStrictEqual(Array.from(result2), sort(Array.from(result2)))
    })))

  it("sliding - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.sliding<number>(n * 2))
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          sort(as),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        yield* (pipe(
          sort(as.map((n) => -n)),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        sort(Array.from(result1).filter((n) => n > 0))
      )
      deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        sort(Array.from(result1).filter((n) => n < 0))
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        sort(Array.from(result2).filter((n) => n > 0))
      )
      deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        sort(Array.from(result2).filter((n) => n < 0))
      )
    })))

  it("unbounded - one to one", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*() {
        const deferred = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.unbounded<number>())
        const subscriber = yield* (pipe(
          STM.commit(TPubSub.subscribe(pubsub)),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        return yield* (Fiber.join(subscriber))
      })
      const result = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result), as)
    })))

  it("unbounded - one to many", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.unbounded<number>())
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1), as)
      deepStrictEqual(Array.from(result2), as)
    })))

  it("unbounded - many to many", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*() {
        const deferred1 = yield* (Deferred.make<void>())
        const deferred2 = yield* (Deferred.make<void>())
        const pubsub = yield* (TPubSub.unbounded<number>())
        const subscriber1 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* (pipe(
          TPubSub.subscribeScoped(pubsub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* (Deferred.await(deferred1))
        yield* (Deferred.await(deferred2))
        yield* (pipe(
          as,
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        yield* (pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* (Fiber.join(subscriber1))
        const result2 = yield* (Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.runPromise(program)
      deepStrictEqual(Array.from(result1).filter((n) => n > 0), as)
      deepStrictEqual(Array.from(result1).filter((n) => n < 0), as.map((n) => -n))
      deepStrictEqual(Array.from(result2).filter((n) => n > 0), as)
      deepStrictEqual(Array.from(result2).filter((n) => n < 0), as.map((n) => -n))
    })))

  it.effect("unbounded - undefined/null values", () =>
    Effect.gen(function*() {
      const as = [null, undefined, null, undefined]
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const pubsub = yield* (TPubSub.unbounded<null | undefined>())
      const subscriber1 = yield* (pipe(
        TPubSub.subscribeScoped(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred1,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      const subscriber2 = yield* (pipe(
        TPubSub.subscribeScoped(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred2,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(deferred1))
      yield* (Deferred.await(deferred2))
      yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
      const result1 = yield* (Fiber.join(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      deepStrictEqual(result1, as)
      deepStrictEqual(result2, as)
    }))

  it.effect("bounded - undefined/null values", () =>
    Effect.gen(function*() {
      const as = [null, undefined]
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const pubsub = yield* (TPubSub.bounded<null | undefined>(2))
      const subscriber1 = yield* (pipe(
        TPubSub.subscribeScoped(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred1,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      const subscriber2 = yield* (pipe(
        TPubSub.subscribeScoped(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred2,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(deferred1))
      yield* (Deferred.await(deferred2))
      yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
      const result1 = yield* (Fiber.join(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      deepStrictEqual(result1, as)
      deepStrictEqual(result2, as)
    }))

  it.effect("dropping - undefined/null values", () =>
    Effect.gen(function*() {
      const as = [null, undefined, null, undefined]
      const n = 2
      const deferred = yield* (Deferred.make<void>())
      const pubsub = yield* (TPubSub.dropping<null | undefined>(n))
      const subscriber = yield* (pipe(
        TPubSub.subscribeScoped(pubsub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(
              as.slice(0, n),
              Effect.forEach(() => TQueue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(deferred))
      yield* (pipe(as, Effect.forEach((n) => pipe(pubsub, TPubSub.publish(n))), Effect.fork))
      const result = yield* (Fiber.join(subscriber))
      deepStrictEqual(result, as.slice(0, n))
    }))
})

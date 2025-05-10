import { describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Chunk, Effect, Exit, Fiber, Mailbox, Stream } from "effect"

describe("Mailbox", () => {
  it.effect("offerAll with capacity", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.offerAll([1, 2, 3, 4]).pipe(
        Effect.fork
      )
      yield* Effect.yieldNow({ priority: 1 })
      assertTrue(fiber.unsafePoll() === null)

      let result = yield* mailbox
      deepStrictEqual(Chunk.toReadonlyArray(result[0]), [1, 2])
      assertFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      assertTrue(fiber.unsafePoll() !== null)

      result = yield* mailbox.takeAll
      deepStrictEqual(Chunk.toReadonlyArray(result[0]), [3, 4])
      assertFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      deepStrictEqual(fiber.unsafePoll(), Exit.succeed(Chunk.empty()))
    }))

  it.effect("offer dropping", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>({ capacity: 2, strategy: "dropping" })
      const remaining = yield* mailbox.offerAll([1, 2, 3, 4])
      deepStrictEqual(Chunk.toReadonlyArray(remaining), [3, 4])
      const result = yield* mailbox.offer(5)
      assertFalse(result)
      deepStrictEqual(Chunk.toReadonlyArray((yield* mailbox.takeAll)[0]), [1, 2])
    }))

  it.effect("offer sliding", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>({ capacity: 2, strategy: "sliding" })
      const remaining = yield* mailbox.offerAll([1, 2, 3, 4])
      deepStrictEqual(Chunk.toReadonlyArray(remaining), [])
      const result = yield* mailbox.offer(5)
      assertTrue(result)
      deepStrictEqual(Chunk.toReadonlyArray((yield* mailbox.takeAll)[0]), [4, 5])
    }))

  it.effect("offerAll can be interrupted", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.offerAll([1, 2, 3, 4]).pipe(
        Effect.fork
      )

      yield* Effect.yieldNow({ priority: 1 })
      yield* Fiber.interrupt(fiber)
      yield* Effect.yieldNow({ priority: 1 })

      let result = yield* mailbox.takeAll
      deepStrictEqual(Chunk.toReadonlyArray(result[0]), [1, 2])
      assertFalse(result[1])

      yield* mailbox.offer(5)
      yield* Effect.yieldNow({ priority: 1 })

      result = yield* mailbox.takeAll
      deepStrictEqual(Chunk.toReadonlyArray(result[0]), [5])
      assertFalse(result[1])
    }))

  it.effect("done completes takes", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.takeAll.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      yield* mailbox.done(Exit.void)
      deepStrictEqual(yield* fiber.await, Exit.succeed([Chunk.empty(), true] as const))
    }))

  it.effect("end", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offerAll([5, 6, 7, 8]))
      yield* Effect.fork(mailbox.offer(9))
      yield* Effect.fork(mailbox.end)
      const items = yield* Stream.runCollect(Mailbox.toStream(mailbox))
      deepStrictEqual(Chunk.toReadonlyArray(items), [1, 2, 3, 4, 5, 6, 7, 8, 9])
      strictEqual(yield* mailbox.await, void 0)
      strictEqual(yield* mailbox.offer(10), false)
    }))

  it.effect("end with take", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2]))
      yield* Effect.fork(mailbox.offer(3))
      yield* Effect.fork(mailbox.end)
      strictEqual(yield* mailbox.take, 1)
      strictEqual(yield* mailbox.take, 2)
      strictEqual(yield* mailbox.take, 3)
      assertNone(yield* mailbox.take.pipe(Effect.optionFromOptional))
      strictEqual(yield* mailbox.await, void 0)
      strictEqual(yield* mailbox.offer(10), false)
    }))

  it.effect("fail", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number, string>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offer(5))
      yield* Effect.fork(mailbox.fail("boom"))
      const takeArr = Effect.map(mailbox.takeAll, ([_]) => Chunk.toReadonlyArray(_))
      deepStrictEqual(yield* takeArr, [1, 2])
      deepStrictEqual(yield* takeArr, [3, 4])
      const [items, done] = yield* mailbox.takeAll
      deepStrictEqual(Chunk.toReadonlyArray(items), [5])
      strictEqual(done, false)
      const error = yield* mailbox.takeAll.pipe(Effect.flip)
      deepStrictEqual(error, "boom")
      strictEqual(yield* mailbox.await.pipe(Effect.flip), "boom")
      strictEqual(yield* mailbox.offer(6), false)
    }))

  it.effect("shutdown", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offerAll([5, 6, 7, 8]))
      yield* Effect.fork(mailbox.shutdown)
      const items = yield* Stream.runCollect(Mailbox.toStream(mailbox))
      deepStrictEqual(Chunk.toReadonlyArray(items), [])
      strictEqual(yield* mailbox.await, void 0)
      strictEqual(yield* mailbox.offer(10), false)
    }))

  it.effect("fail doesnt drop items", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number, string>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offer(5))
      yield* Effect.fork(mailbox.fail("boom"))
      const items: Array<number> = []
      const error = yield* Mailbox.toStream(mailbox).pipe(
        Stream.runForEach((item) => Effect.sync(() => items.push(item))),
        Effect.flip
      )
      deepStrictEqual(items, [1, 2, 3, 4, 5])
      strictEqual(error, "boom")
    }))

  it.effect("await waits for no items", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>()
      const fiber = yield* mailbox.await.pipe(Effect.fork)
      yield* Effect.yieldNow()
      yield* mailbox.offer(1)
      yield* mailbox.end

      yield* Effect.yieldNow()
      assertTrue(fiber.unsafePoll() === null)
      const [result, done] = yield* mailbox.takeAll
      deepStrictEqual(Chunk.toReadonlyArray(result), [1])
      assertTrue(done)
      yield* Effect.yieldNow()
      assertTrue(fiber.unsafePoll() !== null)
    }))

  it.effect("bounded 0 capacity", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(0)
      yield* mailbox.offer(1).pipe(Effect.fork)
      let result = yield* mailbox.take
      strictEqual(result, 1)

      const fiber = yield* mailbox.take.pipe(Effect.fork)
      yield* mailbox.offer(2)
      result = yield* Fiber.join(fiber)
      strictEqual(result, 2)
    }))
})

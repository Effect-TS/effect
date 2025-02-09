import { Chunk, Effect, Exit, Fiber, Mailbox, Option, Stream } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

describe("Mailbox", () => {
  it.effect("offerAll with capacity", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.offerAll([1, 2, 3, 4]).pipe(
        Effect.fork
      )
      yield* Effect.yieldNow({ priority: 1 })
      assert.isNull(fiber.unsafePoll())

      let result = yield* mailbox
      assert.deepStrictEqual(Chunk.toReadonlyArray(result[0]), [1, 2])
      assert.isFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      assert.isNotNull(fiber.unsafePoll())

      result = yield* mailbox.takeAll
      assert.deepStrictEqual(Chunk.toReadonlyArray(result[0]), [3, 4])
      assert.isFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      assert.deepStrictEqual(fiber.unsafePoll(), Exit.succeed(Chunk.empty()))
    }))

  it.effect("offer dropping", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>({ capacity: 2, strategy: "dropping" })
      const remaining = yield* mailbox.offerAll([1, 2, 3, 4])
      assert.deepStrictEqual(Chunk.toReadonlyArray(remaining), [3, 4])
      const result = yield* mailbox.offer(5)
      assert.isFalse(result)
      assert.deepStrictEqual(Chunk.toReadonlyArray((yield* mailbox.takeAll)[0]), [1, 2])
    }))

  it.effect("offer sliding", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>({ capacity: 2, strategy: "sliding" })
      const remaining = yield* mailbox.offerAll([1, 2, 3, 4])
      assert.deepStrictEqual(Chunk.toReadonlyArray(remaining), [])
      const result = yield* mailbox.offer(5)
      assert.isTrue(result)
      assert.deepStrictEqual(Chunk.toReadonlyArray((yield* mailbox.takeAll)[0]), [4, 5])
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
      assert.deepStrictEqual(Chunk.toReadonlyArray(result[0]), [1, 2])
      assert.isFalse(result[1])

      yield* mailbox.offer(5)
      yield* Effect.yieldNow({ priority: 1 })

      result = yield* mailbox.takeAll
      assert.deepStrictEqual(Chunk.toReadonlyArray(result[0]), [5])
      assert.isFalse(result[1])
    }))

  it.effect("done completes takes", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.takeAll.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      yield* mailbox.done(Exit.void)
      assert.deepStrictEqual(yield* fiber.await, Exit.succeed([Chunk.empty(), true] as const))
    }))

  it.effect("end", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offerAll([5, 6, 7, 8]))
      yield* Effect.fork(mailbox.offer(9))
      yield* Effect.fork(mailbox.end)
      const items = yield* Stream.runCollect(Mailbox.toStream(mailbox))
      assert.deepStrictEqual(Chunk.toReadonlyArray(items), [1, 2, 3, 4, 5, 6, 7, 8, 9])
      assert.strictEqual(yield* mailbox.await, void 0)
      assert.strictEqual(yield* mailbox.offer(10), false)
    }))

  it.effect("end with take", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2]))
      yield* Effect.fork(mailbox.offer(3))
      yield* Effect.fork(mailbox.end)
      assert.strictEqual(yield* mailbox.take, 1)
      assert.strictEqual(yield* mailbox.take, 2)
      assert.strictEqual(yield* mailbox.take, 3)
      assert.strictEqual(yield* mailbox.take.pipe(Effect.optionFromOptional), Option.none())
      assert.strictEqual(yield* mailbox.await, void 0)
      assert.strictEqual(yield* mailbox.offer(10), false)
    }))

  it.effect("fail", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number, string>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offer(5))
      yield* Effect.fork(mailbox.fail("boom"))
      const takeArr = Effect.map(mailbox.takeAll, ([_]) => Chunk.toReadonlyArray(_))
      assert.deepStrictEqual(yield* takeArr, [1, 2])
      assert.deepStrictEqual(yield* takeArr, [3, 4])
      const [items, done] = yield* mailbox.takeAll
      assert.deepStrictEqual(Chunk.toReadonlyArray(items), [5])
      assert.strictEqual(done, false)
      const error = yield* mailbox.takeAll.pipe(Effect.flip)
      assert.deepStrictEqual(error, "boom")
      assert.strictEqual(yield* mailbox.await.pipe(Effect.flip), "boom")
      assert.strictEqual(yield* mailbox.offer(6), false)
    }))

  it.effect("shutdown", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      yield* Effect.fork(mailbox.offerAll([1, 2, 3, 4]))
      yield* Effect.fork(mailbox.offerAll([5, 6, 7, 8]))
      yield* Effect.fork(mailbox.shutdown)
      const items = yield* Stream.runCollect(Mailbox.toStream(mailbox))
      assert.deepStrictEqual(Chunk.toReadonlyArray(items), [])
      assert.strictEqual(yield* mailbox.await, void 0)
      assert.strictEqual(yield* mailbox.offer(10), false)
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
      assert.deepStrictEqual(items, [1, 2, 3, 4, 5])
      assert.strictEqual(error, "boom")
    }))

  it.effect("await waits for no items", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>()
      const fiber = yield* mailbox.await.pipe(Effect.fork)
      yield* Effect.yieldNow()
      yield* mailbox.offer(1)
      yield* mailbox.end

      yield* Effect.yieldNow()
      assert.isNull(fiber.unsafePoll())
      const [result, done] = yield* mailbox.takeAll
      assert.deepStrictEqual(Chunk.toReadonlyArray(result), [1])
      assert.isTrue(done)
      yield* Effect.yieldNow()
      assert.isNotNull(fiber.unsafePoll())
    }))

  it.effect("bounded 0 capacity", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(0)
      yield* mailbox.offer(1).pipe(Effect.fork)
      let result = yield* mailbox.take
      assert.strictEqual(result, 1)

      const fiber = yield* mailbox.take.pipe(Effect.fork)
      yield* mailbox.offer(2)
      result = yield* Fiber.join(fiber)
      assert.strictEqual(result, 2)
    }))
})

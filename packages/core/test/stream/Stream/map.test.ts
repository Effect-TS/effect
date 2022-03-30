import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { FiberId } from "../../../src/io/FiberId"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("map", () => {
    it("simple example", async () => {
      const f = (n: number) => n.toString()
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .map(f)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.map(f).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("mapEffect", () => {
    it("Effect.forEach equivalence", async () => {
      const f = (n: number) => n + 1
      const chunk = Chunk(1, 2, 3, 4, 5)
      const stream = Stream.fromIterable(chunk)
      const program = Effect.struct({
        actual: stream
          .mapEffect((n) => Effect.succeed(f(n)))
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: Effect.forEach(chunk, (n) => Effect.succeed(f(n))).map((chunk) =>
          chunk.toArray()
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .mapEffect((n) => (n === 3 ? Effect.fail("boom") : Effect.succeed(n)))
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("boom")
      ])
    })
  })

  describe("mapAccum", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1)
        .mapAccum(0, (acc, el) => Tuple(acc + el, acc + el))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("mapAccumEffect", () => {
    it("happy path", async () => {
      const program = Stream(1, 1, 1)
        .mapAccumEffect(0, (acc, el) => Effect.succeed(Tuple(acc + el, acc + el)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    test("error", async () => {
      const program = Stream(1, 1, 1)
        .mapAccumEffect(0, () => Effect.fail("ouch"))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .mapAccumEffect(undefined, (_, el) =>
          el === 3 ? Effect.fail("boom") : Effect.succeed(Tuple(undefined, el))
        )
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("boom")
      ])
    })
  })

  describe("mapConcatEffect", () => {
    it("happy path", async () => {
      const f = (n: number) => Chunk(n)
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .mapConcatEffect((n) => Effect.succeed(f(n)))
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.flatMap(f).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("error", async () => {
      const program = Stream(1, 2, 3)
        .mapConcatEffect(() => Effect.fail("ouch"))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("mapConcatChunk", () => {
    it("simple example", async () => {
      const f = (n: number) => Chunk(n)
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .mapConcatChunk(f)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.flatMap(f).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("mapConcatChunkEffect", () => {
    it("happy path", async () => {
      const f = (n: number) => Chunk(n)
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .mapConcatChunkEffect((n) => Effect.succeed(f(n)))
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.flatMap(f).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("error", async () => {
      const program = Stream(1, 2, 3)
        .mapConcatChunkEffect(() => Effect.fail("ouch"))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("mapError", () => {
    it("simple example", async () => {
      const program = Stream.fail("123")
        .mapError((s) => Number.parseInt(s))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(123))
    })
  })

  describe("mapErrorCause", () => {
    it("simple example", async () => {
      const program = Stream.fail("123")
        .mapErrorCause((cause) => cause.map((s) => Number.parseInt(s)))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(123))
    })
  })

  describe("mapEffectPar", () => {
    it("foreachParN equivalence", async () => {
      const f = (n: number) => Effect.succeed(n + 1)
      const data = Chunk(1, 2, 3, 4, 5)
      const stream = Stream.fromChunk(data)
      const program = Effect.struct({
        actual: stream
          .mapEffectPar(8, f)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: Effect.forEachPar(data, f)
          .withParallelism(8)
          .map((chunk) => chunk.toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("order when n = 1", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) =>
          Stream.range(0, 9)
            .mapEffectPar(1, (n) => queue.offer(n))
            .runDrain()
        )
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual((result.toArray() as Array<number>).sort())
    })

    it("interruption propagation", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ interrupted, latch }) =>
          Stream(undefined)
            .mapEffectPar(1, () =>
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                interrupted.set(true)
              )
            )
            .runDrain()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ interrupted }) => interrupted.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("guarantee ordering", async () => {
      const data = Chunk(1, 2, 3, 4, 5)
      const program = Effect.struct({
        mapEffect: Stream.fromIterable(data)
          .mapEffect(Effect.succeedNow)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        mapEffectPar: Stream.fromIterable(data)
          .mapEffectPar(8, Effect.succeedNow)
          .runCollect()
          .map((chunk) => chunk.toArray())
      })

      const { mapEffect, mapEffectPar } = await program.unsafeRunPromise()

      expect(mapEffect).toEqual(mapEffectPar)
    })

    it("awaits children fibers properly", async () => {
      const promise = Promise.unsafeMake<never, void>(FiberId.none)
      const program = Stream.fromIterable(Chunk.range(0, 100))
        .interruptWhen(promise.await())
        .mapEffectPar(8, () => Effect.succeed(1).repeatN(200))
        .runDrain()
        .exit()
        .map((exit) => exit.isInterrupted())

      const result = await program.unsafeRunPromise()
      await promise.succeed(undefined).unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("interrupts pending tasks when one of the tasks fails", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(0))
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("result", ({ interrupted, latch1, latch2 }) =>
          Stream(1, 2, 3)
            .mapEffectPar(3, (n) =>
              n === 1
                ? (latch1.succeed(undefined) > Effect.never).onInterrupt(() =>
                    interrupted.update((n) => n + 1)
                  )
                : n === 2
                ? (latch2.succeed(undefined) > Effect.never).onInterrupt(() =>
                    interrupted.update((n) => n + 1)
                  )
                : latch1.await() > latch2.await() > Effect.fail("boom")
            )
            .runDrain()
            .exit()
        )
        .bind("count", ({ interrupted }) => interrupted.get)

      const { count, result } = await program.unsafeRunPromise()

      expect(count).toBe(2)
      expect(result.untraced()).toEqual(Exit.fail("boom"))
    })

    test("propagates correct error with subsequent mapEffectPar call (ZIO issue #4514)", async () => {
      const program = Stream.fromIterable(Chunk.range(1, 50))
        .mapEffectPar(20, (i) => (i < 10 ? Effect.succeed(i) : Effect.fail("boom")))
        .mapEffectPar(20, Effect.succeedNow)
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("propagates error of original stream", async () => {
      const program = (Stream(1, 2, 3, 4, 5, 6, 7, 8, 9, 10) + Stream.fail("boom"))
        .mapEffectPar(2, () => Effect.sleep(Duration(100)))
        .runDrain()
        .fork()
        .flatMap((fiber) => fiber.await())

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.fail("boom"))
    })
  })

  describe("mapEffectParUnordered", () => {
    it("mapping with failure is failure", async () => {
      const program = Stream.fromIterable(Chunk.range(0, 3))
        .mapEffectParUnordered(10, () => Effect.fail("fail"))
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })
  })
})

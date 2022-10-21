import { createQueueSpy } from "@effect/core/test/stream/Sink/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Sink", () => {
  describe.concurrent("succeed", () => {
    it("result is ok", () =>
      Do(($) => {
        const sink = Sink.succeed("ok")
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "ok")
      }).unsafeRunPromise())
  })

  describe.concurrent("fail", () => {
    it("handles leftovers", () =>
      Do(($) => {
        const sink = Sink.failSync("boom").foldSink(
          (err) => Sink.collectAll<number>().map((c) => [c, err] as const),
          (): Sink<never, never, number, never, readonly [Chunk<number>, string]> => {
            throw new Error("should never happen")
          }
        )
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.isTrue(result[0] == Chunk(1, 2, 3))
        assert.strictEqual(result[1], "boom")
      }).unsafeRunPromise())
  })

  describe.concurrent("drain", () => {
    it("fails if upstream fails", () =>
      Do(($) => {
        const sink = Sink.drain()
        const stream = Stream.succeed(1).mapEffect(() => Effect.failSync("boom"))
        const result = $(stream.run(sink).exit)
        assert.isTrue(result == Exit.fail("boom"))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("collectAllN", () => {
    it("respects the given limit", () =>
      Do(($) => {
        const sink = Sink.collectAllN(3)
        const stream = Stream.fromChunk(Chunk(1, 2, 3, 4)).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(Chunk(1, 2, 3), Chunk(4)))
      }).unsafeRunPromise())

    it("produces empty trailing chunks", () =>
      Do(($) => {
        const sink = Sink.collectAllN(4)
        const stream = Stream.fromChunk(Chunk(1, 2, 3, 4)).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(Chunk(1, 2, 3, 4), Chunk.empty<number>()))
      }).unsafeRunPromise())

    it("handles empty input", () =>
      Do(($) => {
        const sink = Sink.collectAllN(3)
        const stream = Stream.fromChunk(Chunk.empty<number>()).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(Chunk.empty()))
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllToSet", () => {
    it("collects unique elements", () =>
      Do(($) => {
        const sink = Sink.collectAllToSet<number>()
        const stream = Stream(1, 2, 3, 3, 4)
        const result = $(stream.run(sink))
        assert.isTrue(result == HashSet(1, 2, 3, 4))
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllToSetN", () => {
    it("respects the given limit", () =>
      Do(($) => {
        const sink = Sink.collectAllToSetN<number>(3)
        const stream = Stream.fromChunks(Chunk(1, 2, 1), Chunk(2, 3, 3, 4)).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(HashSet(1, 2, 3), HashSet(4)))
      }).unsafeRunPromise())

    it("handles empty input", () =>
      Do(($) => {
        const sink = Sink.collectAllToSetN<number>(3)
        const stream = Stream.fromChunk(Chunk.empty<number>()).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(HashSet.empty()))
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllToMap", () => {
    it("collects unique elements", () =>
      Do(($) => {
        const sink = Sink.collectAllToMap((n: number) => n % 3, (a, b) => a + b)
        const stream = Stream.range(0, 10)
        const result = $(stream.run(sink))
        const expected = HashMap([0, 18] as const, [1, 12] as const, [2, 15] as const)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllToMapN", () => {
    it("respects the given limit", () =>
      Do(($) => {
        const sink = Sink.collectAllToMapN(2, (n: number) => n % 3, (a, b) => a + b)
        const stream = Stream.fromChunk(Chunk(1, 1, 2, 2, 3, 2, 4, 5)).transduce(sink)
        const result = $(stream.runCollect)
        const expected = Chunk(
          HashMap([1, 2] as const, [2, 4] as const),
          HashMap([0, 3] as const, [2, 2] as const),
          HashMap([1, 4] as const, [2, 5] as const)
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("collects as long as map size does not exceed the limit", () =>
      Do(($) => {
        const sink = Sink.collectAllToMapN(3, (n: number) => n % 3, (a, b) => a + b)
        const stream = Stream.fromChunks(Chunk(0, 1, 2), Chunk(3, 4, 5), Chunk(6, 7, 8, 9))
        const result = $(stream.transduce(sink).runCollect)
        const expected = Chunk(HashMap([0, 18] as const, [1, 12] as const, [2, 15] as const))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("handles empty input", () =>
      Do(($) => {
        const sink = Sink.collectAllToMapN(3, (n: number) => n % 3, (a, b) => a + b)
        const stream = Stream.fromChunk(Chunk.empty<number>()).transduce(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(HashMap.empty()))
      }).unsafeRunPromise())
  })

  describe.concurrent("dropWhile", () => {
    it("should drop elements while the predicate holds true", () =>
      Do(($) => {
        const sink = Sink.dropWhile<number>((n) => n < 3)
        const stream = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5).pipeThrough(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(3, 4, 5, 1, 2, 3, 4, 5))
      }).unsafeRunPromise())
  })

  describe.concurrent("dropWhileEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.dropWhileEffect((n: number) => Effect.sync(n < 3))
        const stream = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5).pipeThrough(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(3, 4, 5, 1, 2, 3, 4, 5))
      }).unsafeRunPromise())

    it("error", () =>
      Do(($) => {
        const sink = Sink.dropWhileEffect((n: number) => Effect.sync(n < 3))
        const stream = Stream(1, 2, 3)
          .concat(Stream.failSync("boom"))
          .concat(Stream(5, 1, 2, 3, 4, 5))
          .pipeThrough(sink)
          .pipeThrough(sink)
          .either
        const result = $(stream.runCollect)
        const expected = Chunk(Either.right(3), Either.left("boom"))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })

  describe.concurrent("environmentWithSink", () => {
    it("should access the environment with the provided sink", () =>
      Do(($) => {
        const StringTag = Tag<string>()
        const sink = Sink
          .environmentWithSink((env: Env<string>) => Sink.succeed(env.get(StringTag)))
          .provideEnvironment(Env(StringTag, "use this"))
        const stream = Stream("ignore this")
        const result = $(stream.run(sink))
        assert.strictEqual(result, "use this")
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllWhileWith", () => {
    it("example 1", () =>
      Do(($) => {
        const sink = Sink.sum().collectAllWhileWith(-1, constTrue, (a, b) => a + b)
        const stream = (size: number) => Stream.fromChunk(Chunk.range(1, 10)).rechunk(size)
        const result = $(Effect.forEach(List(1, 3, 20), (size) => stream(size).run(sink)))
        assert.isTrue(result == Chunk(54, 54, 54))
      }).unsafeRunPromise())

    it("example 2", () =>
      Do(($) => {
        const sink = Sink.head<number>().collectAllWhileWith(
          List.empty<number>(),
          (option) => option.fold(constTrue, (n) => n < 5),
          (acc: List<number>, a) => (a.isSome() ? acc.prepend(a.value) : acc)
        ).map((list: List<number>) => list.reverse)
        const stream = Stream.fromChunk(Chunk.range(1, 100))
        const result = $(stream.concat(stream).rechunk(3).run(sink))
        assert.isTrue(result == List(1, 2, 3, 4))
      }).unsafeRunPromise())
  })

  describe.concurrent("head", () => {
    it("should return the first element", () =>
      Do(($) => {
        const sink = Sink.head()
        const stream = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4))
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("should return None for the empty stream", () =>
      Do(($) => {
        const sink = Sink.head()
        const stream = Stream.empty
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("last", () => {
    it("should return the last element", () =>
      Do(($) => {
        const sink = Sink.last()
        const stream = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4))
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.some(4))
      }).unsafeRunPromise())

    it("should return None for the empty stream", () =>
      Do(($) => {
        const sink = Sink.last()
        const stream = Stream.empty
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("unwrapScoped", () => {
    it("happy path", () =>
      Do(($) => {
        const closed = $(Ref.make(false))
        const effect = Effect.acquireRelease(Effect.sync(100), () => closed.set(true))
        const sink = Sink.unwrapScoped(
          effect.map((n) =>
            Sink.count().mapEffect((cnt) => closed.get.map((cl) => [cnt + n, cl] as const))
          )
        )
        const finalResult = $(Stream(1, 2, 3).run(sink))
        const [result, state] = finalResult
        const finalState = $(closed.get)
        assert.strictEqual(result, 103)
        assert.isFalse(state)
        assert.isTrue(finalState)
      }).unsafeRunPromise())

    it("sad path", () =>
      Do(($) => {
        const closed = $(Ref.make(false))
        const effect = Effect.acquireRelease(Effect.sync(100), () => closed.set(true))
        const sink = Sink.unwrapScoped(effect.as(Sink.succeed("ok")))
        const result = $(Stream.failSync("fail").run(sink))
        const state = $(closed.get)
        assert.strictEqual(result, "ok")
        assert.isTrue(state)
      }).unsafeRunPromise())
  })

  describe.concurrent("fromEffect", () => {
    it("result is ok", () =>
      Do(($) => {
        const sink = Sink.fromEffect(Effect.sync("ok"))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "ok")
      }).unsafeRunPromise())
  })

  describe.concurrent("fromQueue", () => {
    it("should enqueue all elements", () =>
      Do(($) => {
        const queue = $(Queue.unbounded<number>())
        const sink = Sink.fromQueue(queue)
        const stream = Stream(1, 2, 3)
        $(stream.run(sink))
        const result = $(queue.takeAll)
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())
  })

  describe.concurrent("fromQueueWithShutdown", () => {
    it("should enqueue all elements", () =>
      Do(($) => {
        const queue = $(Queue.unbounded<number>().map(createQueueSpy))
        const sink = Sink.fromQueueWithShutdown(queue)
        const stream = Stream(1, 2, 3)
        $(stream.run(sink))
        const values = $(queue.takeAll)
        const isShutdown = $(queue.isShutdown)
        assert.isTrue(values == Chunk(1, 2, 3))
        assert.isTrue(isShutdown)
      }).unsafeRunPromise())
  })

  describe.concurrent("fromHub", () => {
    it("should publish all elements", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const hub = $(Hub.unbounded<number>())
        const sink = Sink.fromHub(hub)
        const stream = Stream(1, 2, 3)
        const fiber = $(
          Effect.scoped(hub.subscribe.flatMap(
            (s) =>
              deferred1.succeed(undefined)
                .zipRight(deferred2.await)
                .zipRight(s.takeAll)
          )).fork
        )
        $(deferred1.await)
        $(stream.run(sink))
        $(deferred2.succeed(undefined))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())
  })

  describe.concurrent("fromHubWithShutdown", () => {
    it("should shutdown hub", () =>
      Do(($) => {
        const hub = $(Hub.unbounded<number>())
        const sink = Sink.fromHubWithShutdown(hub)
        const stream = Stream(1, 2, 3)
        $(stream.run(sink))
        const result = $(hub.isShutdown)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})

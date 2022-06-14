import { createQueueSpy } from "@effect/core/test/stream/Sink/test-utils"
import { absurd, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Sink", () => {
  describe.concurrent("succeed", () => {
    it("result is ok", async () => {
      const program = Stream(1, 2, 3).run(Sink.succeed("ok"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "ok")
    })
  })

  describe.concurrent("fail", () => {
    it("handles leftovers", async () => {
      const sink = Sink.fail("boom").foldSink(
        (err) => Sink.collectAll<number>().map((c) => Tuple(c, err)),
        () =>
          absurd<Sink<never, never, number, never, Tuple<[Chunk<number>, string]>>>(
            null as never
          )
      )
      const program = Stream(1, 2, 3).run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.get(0) == Chunk(1, 2, 3))
      assert.strictEqual(result.get(1), "boom")
    })
  })

  describe.concurrent("drain", () => {
    it("fails if upstream fails", async () => {
      const program = Stream(1)
        .mapEffect(() => Effect.fail("boom"))
        .run(Sink.drain)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("boom"))
    })
  })

  describe.concurrent("collectAllN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunk(Chunk(1, 2, 3, 4))
        .transduce(Sink.collectAllN(3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2, 3), Chunk(4)))
    })

    it("produces empty trailing chunks", async () => {
      const program = Stream.fromChunk(Chunk(1, 2, 3, 4))
        .transduce(Sink.collectAllN(4))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2, 3, 4), Chunk.empty<number>()))
    })

    it("handles empty input", async () => {
      const program = Stream.fromChunk(Chunk.empty<number>())
        .transduce(Sink.collectAllN(3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk.empty()))
    })
  })

  describe.concurrent("collectAllToSet", () => {
    it("collects unique elements", async () => {
      const program = Stream(1, 2, 3, 3, 4).run(Sink.collectAllToSet<number>())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.toImmutableArray == ImmutableArray(1, 2, 3, 4))
    })
  })

  describe.concurrent("collectAllToSetN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunks(Chunk(1, 2, 1), Chunk(2, 3, 3, 4))
        .transduce(Sink.collectAllToSetN<number>(3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(HashSet(1, 2, 3), HashSet(4)))
    })

    it("handles empty input", async () => {
      const program = Stream.fromChunk(Chunk.empty<number>())
        .transduce(Sink.collectAllToSetN<number>(3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(HashSet.empty()))
    })
  })

  describe.concurrent("collectAllToMap", () => {
    it("collects unique elements", async () => {
      const program = Stream.range(0, 10).run(
        Sink.collectAllToMap(
          (n: number) => n % 3,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == HashMap(
          Tuple(0, 18),
          Tuple(1, 12),
          Tuple(2, 15)
        )
      )
    })
  })

  describe.concurrent("collectAllToMapN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunk(Chunk(1, 1, 2, 2, 3, 2, 4, 5))
        .transduce(
          Sink.collectAllToMapN(
            2,
            (n: number) => n % 3,
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          HashMap(Tuple(1, 2), Tuple(2, 4)),
          HashMap(Tuple(0, 3), Tuple(2, 2)),
          HashMap(Tuple(1, 4), Tuple(2, 5))
        )
      )
    })

    it("collects as long as map size does not exceed the limit", async () => {
      const program = Stream.fromChunks(
        Chunk(0, 1, 2),
        Chunk(3, 4, 5),
        Chunk(6, 7, 8, 9)
      )
        .transduce(
          Sink.collectAllToMapN(
            3,
            (n: number) => n % 3,
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(HashMap(Tuple(0, 18), Tuple(1, 12), Tuple(2, 15))))
    })

    it("handles empty input", async () => {
      const program = Stream.fromChunk(Chunk.empty<number>())
        .transduce(
          Sink.collectAllToMapN(
            3,
            (n: number) => n % 3,
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(HashMap.empty()))
    })
  })

  describe.concurrent("dropWhile", () => {
    it("should drop elements while the predicate holds true", async () => {
      const program = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5)
        .pipeThrough(Sink.dropWhile<number>((n) => n < 3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(3, 4, 5, 1, 2, 3, 4, 5))
    })
  })

  describe.concurrent("dropWhileEffect", () => {
    it("happy path", async () => {
      const program = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5)
        .pipeThrough(Sink.dropWhileEffect((n) => Effect.succeed(n < 3)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(3, 4, 5, 1, 2, 3, 4, 5))
    })

    it("error", async () => {
      const program = (Stream(1, 2, 3) + Stream.fail("boom") + Stream(5, 1, 2, 3, 4, 5))
        .pipeThrough(Sink.dropWhileEffect((n) => Effect.succeed(n < 3)))
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Either.right(3), Either.left("boom")))
    })
  })

  describe.concurrent("environmentWithSink", () => {
    it("should access the environment with the provided sink", async () => {
      const StringTag = Tag<string>()
      const program = Stream("ignore this").run(
        Sink.environmentWithSink((env: Env<string>) => Sink.succeed(env.get(StringTag))).provideEnvironment(
          Env(StringTag, "use this")
        )
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "use this")
    })
  })

  describe.concurrent("collectAllWhileWith", () => {
    it("example 1", async () => {
      const program = Effect.forEach(List(1, 3, 20), (chunkSize) =>
        Stream.fromChunk(Chunk.range(1, 10))
          .rechunk(chunkSize)
          .run(Sink.sum().collectAllWhileWith(-1, constTrue, (a, b) => a + b)))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(54, 54, 54))
    })

    it("example 2", async () => {
      const sink = Sink.head<number>().collectAllWhileWith(
        List.empty<number>(),
        (option) => option.fold(constTrue, (n) => n < 5),
        (acc: List<number>, a) => (a.isSome() ? acc.prepend(a.value) : acc)
      ).map((list: List<number>) => list.reverse)
      const stream = Stream.fromChunk(Chunk.range(1, 100))
      const program = (stream + stream).rechunk(3).run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == List(1, 2, 3, 4))
    })
  })

  describe.concurrent("head", () => {
    it("should return the first element", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4)).run(Sink.head)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(1))
    })

    it("should return None for the empty stream", async () => {
      const program = Stream.empty.run(Sink.head)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.none)
    })
  })

  describe.concurrent("last", () => {
    it("should return the last element", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4)).run(Sink.last())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(4))
    })

    it("should return None for the empty stream", async () => {
      const program = Stream.empty.run(Sink.last())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.none)
    })
  })

  describe.concurrent("unwrapScoped", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue("res", ({ closed }) => Effect.acquireRelease(Effect.succeed(100), () => closed.set(true)))
        .bindValue("sink", ({ closed, res }) =>
          Sink.unwrapScoped(
            res.map((m) => Sink.count().mapEffect((cnt) => closed.get().map((cl) => Tuple(cnt + m, cl))))
          ))
        .bind("resAndState", ({ sink }) => Stream(1, 2, 3).run(sink))
        .bind("finalState", ({ closed }) => closed.get())

      const { finalState, resAndState } = await program.unsafeRunPromise()

      assert.strictEqual(resAndState.get(0), 103)
      assert.isFalse(resAndState.get(1))
      assert.isTrue(finalState)
    })

    it("sad path", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue("res", ({ closed }) => Effect.acquireRelease(Effect.succeed(100), () => closed.set(true)))
        .bindValue("sink", ({ closed, res }) => Sink.unwrapScoped(res.map(() => Sink.succeed("ok"))))
        .bind("finalResult", ({ sink }) => Stream.fail("fail").run(sink))
        .bind("finalState", ({ closed }) => closed.get())

      const { finalResult, finalState } = await program.unsafeRunPromise()

      assert.strictEqual(finalResult, "ok")
      assert.isTrue(finalState)
    })
  })

  describe.concurrent("fromEffect", () => {
    it("result is ok", async () => {
      const program = Stream(1, 2, 3).run(Sink.fromEffect(Effect.succeed("ok")))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "ok")
    })
  })

  describe.concurrent("fromQueue", () => {
    it("should enqueue all elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => Stream(1, 2, 3).run(Sink.fromQueue(queue)))
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("fromQueueWithShutdown", () => {
    it("should enqueue all elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>().map(createQueueSpy))
        .tap(({ queue }) => Stream(1, 2, 3).run(Sink.fromQueueWithShutdown(queue)))
        .bind("values", ({ queue }) => queue.takeAll)
        .bind("isShutdown", ({ queue }) => queue.isShutdown)

      const { isShutdown, values } = await program.unsafeRunPromise()

      assert.isTrue(values == Chunk(1, 2, 3))
      assert.isTrue(isShutdown)
    })
  })

  describe.concurrent("fromHub", () => {
    it("should publish all elements", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("hub", () => Hub.unbounded<number>())
        .bind("fiber", ({ deferred1, deferred2, hub }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (s) => deferred1.succeed(undefined) > deferred2.await() > s.takeAll
            )
          ).fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ hub }) => Stream(1, 2, 3).run(Sink.fromHub(hub)))
        .tap(({ deferred2 }) => deferred2.succeed(undefined))
        .flatMap(({ fiber }) => fiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("fromHubWithShutdown", () => {
    it("should shutdown hub", async () => {
      const program = Effect.Do()
        .bind("hub", () => Hub.unbounded<number>())
        .tap(({ hub }) => Stream(1, 2, 3).run(Sink.fromHubWithShutdown(hub)))
        .flatMap(({ hub }) => hub.isShutdown)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

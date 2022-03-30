import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Either } from "../../../src/data/Either"
import { absurd, constTrue } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Hub } from "../../../src/io/Hub"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"
import { createQueueSpy } from "./test-utils"

describe("Sink", () => {
  describe("succeed", () => {
    it("result is ok", async () => {
      const program = Stream(1, 2, 3).run(Sink.succeed("ok"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("ok")
    })
  })

  describe("fail", () => {
    it("handles leftovers", async () => {
      const sink = Sink.fail("boom").foldSink(
        (err) => Sink.collectAll<number>().map((c) => Tuple(c, err)),
        () =>
          absurd<Sink<unknown, never, number, never, Tuple<[Chunk<number>, string]>>>(
            null as never
          )
      )
      const program = Stream(1, 2, 3).run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.get(0).toArray()).toEqual([1, 2, 3])
      expect(result.get(1)).toEqual("boom")
    })
  })

  describe("drain", () => {
    it("fails if upstream fails", async () => {
      const program = Stream(1)
        .mapEffect(() => Effect.fail("boom"))
        .run(Sink.drain())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("boom"))
    })
  })

  describe("collectAllN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunk(Chunk(1, 2, 3, 4))
        .transduce(Sink.collectAllN(3))
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1, 2, 3], [4]])
    })

    it("produces empty trailing chunks", async () => {
      const program = Stream.fromChunk(Chunk(1, 2, 3, 4))
        .transduce(Sink.collectAllN(4))
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1, 2, 3, 4], []])
    })

    it("handles empty input", async () => {
      const program = Stream.fromChunk(Chunk.empty<number>())
        .transduce(Sink.collectAllN(3))
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[]])
    })
  })

  describe("collectAllToSet", () => {
    it("collects unique elements", async () => {
      const program = Stream(1, 2, 3, 3, 4).run(Sink.collectAllToSet<number>())

      const result = await program.unsafeRunPromise()

      expect([...result]).toEqual([1, 2, 3, 4])
    })
  })

  describe("collectAllToSetN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunks(Chunk(1, 2, 1), Chunk(2, 3, 3, 4))
        .transduce(Sink.collectAllToSetN<number>(3))
        .map((set) => [...set])
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1, 2, 3], [4]])
    })

    it("handles empty input", async () => {
      const program = Stream.fromChunk(Chunk.empty<number>())
        .transduce(Sink.collectAllToSetN<number>(3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.map((set) => [...set]).toArray()).toEqual([[]])
    })
  })

  describe("collectAllToMap", () => {
    it("collects unique elements", async () => {
      const program = Stream.range(0, 10).run(
        Sink.collectAllToMap(
          (n: number) => n % 3,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      expect([...result]).toEqual([
        [0, 18],
        [1, 12],
        [2, 15]
      ])
    })
  })

  describe("collectAllToMapN", () => {
    it("respects the given limit", async () => {
      const program = Stream.fromChunk(Chunk(1, 1, 2, 2, 3, 2, 4, 5))
        .transduce(
          Sink.collectAllToMapN(
            2,
            (n: number) => n % 3,
            (a, b) => a + b
          )
        )
        .map((map) => [...map])
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [
          [1, 2],
          [2, 4]
        ],
        [
          [0, 3],
          [2, 2]
        ],
        [
          [1, 4],
          [2, 5]
        ]
      ])
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
        .map((map) => [...map])
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [
          [0, 18],
          [1, 12],
          [2, 15]
        ]
      ])
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
        .map((map) => [...map])
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[]])
    })
  })

  describe("dropWhile", () => {
    it("should drop elements while the predicate holds true", async () => {
      const program = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5)
        .pipeThrough(Sink.dropWhile<number>((n) => n < 3))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([3, 4, 5, 1, 2, 3, 4, 5])
    })
  })

  describe("dropWhileEffect", () => {
    it("happy path", async () => {
      const program = Stream(1, 2, 3, 4, 5, 1, 2, 3, 4, 5)
        .pipeThrough(Sink.dropWhileEffect((n) => Effect.succeed(n < 3)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([3, 4, 5, 1, 2, 3, 4, 5])
    })

    it("error", async () => {
      const program = (Stream(1, 2, 3) + Stream.fail("boom") + Stream(5, 1, 2, 3, 4, 5))
        .pipeThrough(Sink.dropWhileEffect((n) => Effect.succeed(n < 3)))
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([Either.right(3), Either.left("boom")])
    })
  })

  describe("environmentWithSink", () => {
    it("should access the environment with the provided sink", async () => {
      const program = Stream("ignore this").run(
        Sink.environmentWithSink((env: string) => Sink.succeed(env)).provideEnvironment(
          "use this"
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("use this")
    })
  })

  describe("collectAllWhileWith", () => {
    it("example 1", async () => {
      const program = Effect.forEach(List(1, 3, 20), (chunkSize) =>
        Stream.fromChunk(Chunk.range(1, 10))
          .rechunk(chunkSize)
          .run(Sink.sum().collectAllWhileWith(-1, constTrue, (a, b) => a + b))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([54, 54, 54])
    })

    it("example 2", async () => {
      const sink = Sink.head<number>().collectAllWhileWith(
        List.empty<number>(),
        (option) => option.fold(constTrue, (n) => n < 5),
        (acc, a) => (a.isSome() ? acc.append(a.value) : acc)
      )
      const stream = Stream.fromChunk(Chunk.range(1, 100))
      const program = (stream + stream).rechunk(3).run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4])
    })
  })

  describe("head", () => {
    it("should return the first element", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4)).run(Sink.head())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("should return None for the empty stream", async () => {
      const program = Stream.empty.run(Sink.head())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("last", () => {
    it("should return the last element", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4)).run(Sink.last())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(4))
    })

    it("should return None for the empty stream", async () => {
      const program = Stream.empty.run(Sink.last())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("unwrapManaged", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue("res", ({ closed }) =>
          Effect.acquireRelease(Effect.succeed(100), () => closed.set(true))
        )
        .bindValue("sink", ({ closed, res }) =>
          Sink.unwrapScoped(
            res.map((m) =>
              Sink.count().mapEffect((cnt) =>
                closed.get.map((cl) => Tuple(cnt + m, cl))
              )
            )
          )
        )
        .bind("resAndState", ({ sink }) => Stream(1, 2, 3).run(sink))
        .bind("finalState", ({ closed }) => closed.get)

      const { finalState, resAndState } = await program.unsafeRunPromise()

      expect(resAndState.get(0)).toBe(103)
      expect(resAndState.get(1)).toBe(false)
      expect(finalState).toBe(true)
    })

    it("sad path", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue("res", ({ closed }) =>
          Effect.acquireRelease(Effect.succeed(100), () => closed.set(true))
        )
        .bindValue("sink", ({ closed, res }) =>
          Sink.unwrapScoped(res.map(() => Sink.succeed("ok")))
        )
        .bind("finalResult", ({ sink }) => Stream.fail("fail").run(sink))
        .bind("finalState", ({ closed }) => closed.get)

      const { finalResult, finalState } = await program.unsafeRunPromise()

      expect(finalResult).toBe("ok")
      expect(finalState).toBe(true)
    })
  })

  describe("fromEffect", () => {
    it("result is ok", async () => {
      const program = Stream(1, 2, 3).run(Sink.fromEffect(Effect.succeed("ok")))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("ok")
    })
  })

  describe("fromQueue", () => {
    it("should enqueue all elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => Stream(1, 2, 3).run(Sink.fromQueue(queue)))
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("fromQueueWithShutdown", () => {
    it("should enqueue all elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>().map(createQueueSpy))
        .tap(({ queue }) => Stream(1, 2, 3).run(Sink.fromQueueWithShutdown(queue)))
        .bind("values", ({ queue }) => queue.takeAll)
        .bind("isShutdown", ({ queue }) => queue.isShutdown)

      const { isShutdown, values } = await program.unsafeRunPromise()

      expect(values.toArray()).toEqual([1, 2, 3])
      expect(isShutdown).toBe(true)
    })
  })

  describe("fromHub", () => {
    it("should publish all elements", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("hub", () => Hub.unbounded<number>())
        .bind("fiber", ({ hub, promise1, promise2 }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (s) => promise1.succeed(undefined) > promise2.await() > s.takeAll
            )
          ).fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ hub }) => Stream(1, 2, 3).run(Sink.fromHub(hub)))
        .tap(({ promise2 }) => promise2.succeed(undefined))
        .flatMap(({ fiber }) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("fromHubWithShutdown", () => {
    it("should shutdown hub", async () => {
      const program = Effect.Do()
        .bind("hub", () => Hub.unbounded<number>())
        .tap(({ hub }) => Stream(1, 2, 3).run(Sink.fromHubWithShutdown(hub)))
        .flatMap(({ hub }) => hub.isShutdown)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})

import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { constTrue, constVoid, identity } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { FiberId } from "../../../src/io/FiberId"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { Schedule } from "../../../src/io/Schedule"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"
import { TakeInternal } from "../../../src/stream/Take/operations/_internal/TakeInternal"
import { chunkCoordination } from "./test-utils"

describe("Stream", () => {
  describe("aggregateAsync", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1, 1)
        .aggregateAsync(
          Sink.foldUntil(List.empty<number>(), 3, (acc, el) => acc.prepend(el))
        )
        .map((list) => Chunk.from(list))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.flatten().toArray()).toEqual([1, 1, 1, 1])
      expect(result.forAll((list) => list.length <= 3)).toBe(true)
    })

    it("error propagation 1", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1).aggregateAsync(Sink.die(error)).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("error propagation 2", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregateAsync(Sink.foldLeftEffect(List.empty(), () => Effect.die(error)))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("interruption propagation 1", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.foldEffect(List.empty<number>(), constTrue, (acc, el) =>
            el === 1
              ? Effect.succeedNow(acc.prepend(el))
              : (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  cancelled.set(true)
                )
          )
        )
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2).aggregateAsync(sink).runCollect().fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interruption propagation 2", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.fromEffect(
            (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
              cancelled.set(true)
            )
          )
        )
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2).aggregateAsync(sink).runCollect().fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("leftover handling", async () => {
      const data = List(1, 2, 2, 3, 2, 3)
      const program = Stream(...data)
        .aggregateAsync(
          Sink.foldWeighted(
            List.empty<number>(),
            (_, i: number) => i,
            4,
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse())
        .runCollect()
        .map((chunk) => List.from(chunk).flatten().toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(data.toArray())
    })

    it("ZIO regression test issue 6395", async () => {
      const program = Stream(1, 2, 3)
        .aggregateAsync(Sink.collectAllN<number>(2))
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1, 2], [3]])
    })
  })

  describe("aggregateAsyncWithin", () => {
    it("fails fast", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) =>
          Stream.range(1, 10)
            .tap((i) => Effect.when(i === 6, Effect.fail("boom")) > queue.offer(i))
            .aggregateAsyncWithin(
              Sink.foldUntil(undefined, 5, constVoid),
              Schedule.forever
            )
            .runDrain()
            .catchAll(() => Effect.succeedNow(undefined))
        )
        .bind("value", ({ queue }) => queue.takeAll())
        .tap(({ queue }) => queue.shutdown())

      const { value } = await program.unsafeRunPromise()

      expect(value.toArray()).toEqual([1, 2, 3, 4, 5])
    })

    it("child fiber handling", async () => {
      const promise = Promise.unsafeMake<never, void>(FiberId.none)
      const program = chunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))).flatMap(
        (c) =>
          Effect.Do()
            .bind("fiber", () =>
              Stream.fromQueue(c.queue.map((exit) => new TakeInternal(exit)))
                .tap(() => c.proceed)
                .flattenTake()
                .aggregateAsyncWithin(Sink.last(), Schedule.fixed(Duration(200)))
                .interruptWhen(promise.await())
                .take(2)
                .runCollect()
                .fork()
            )
            .tap(() => (c.offer > Effect.sleep(100) > c.awaitNext).repeatN(3))
            .flatMap(({ fiber }) =>
              fiber.join().map((chunk) => chunk.collect(identity))
            )
      )

      const result = await program.unsafeRunPromise()
      await promise.succeed(undefined).unsafeRunPromise()

      expect(result.toArray()).toEqual([2, 3])
    })
  })

  describe("aggregateAsyncWithinEither", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1, 1, 2, 2)
        .aggregateAsyncWithinEither(
          Sink.fold(
            Tuple(List.empty<number>(), true),
            (tuple) => tuple.get(1),
            (acc, el: number) =>
              el === 1
                ? Tuple(acc.get(0).prepend(el), true)
                : Tuple(acc.get(0).prepend(el), false)
          ).map((tuple) => tuple.get(0)),
          Schedule.spaced(Duration.fromMinutes(30))
        )
        .map((either) => either.map((list) => list.toArray()))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right([2, 1, 1, 1, 1]),
        Either.right([2]),
        Either.right([])
      ])
    })

    it("error propagation 1", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregateAsyncWithinEither(
          Sink.die(error),
          Schedule.spaced(Duration.fromMinutes(30))
        )
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("error propagation 2", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregateAsyncWithinEither(
          Sink.foldLeftEffect(List.empty(), () => Effect.die(error)),
          Schedule.spaced(Duration.fromMinutes(30))
        )
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("interruption propagation 1", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.foldEffect(List.empty<number>(), constTrue, (acc, el) =>
            el === 1
              ? Effect.succeedNow(acc.prepend(el))
              : (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  cancelled.set(true)
                )
          )
        )
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2)
            .aggregateAsyncWithinEither(sink, Schedule.spaced(Duration.fromMinutes(30)))
            .runCollect()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interruption propagation 2", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.fromEffect(
            (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
              cancelled.set(true)
            )
          )
        )
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2)
            .aggregateAsyncWithinEither(sink, Schedule.spaced(Duration.fromMinutes(30)))
            .runCollect()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("leftover handling", async () => {
      const data = List(1, 2, 2, 3, 2, 3)
      const program = Stream(...data)
        .aggregateAsyncWithinEither(
          Sink.foldWeighted(
            List.empty<number>(),
            (_, n: number) => n,
            4,
            (acc, el) => acc.prepend(el)
          ).map((list) => list.reverse()),
          Schedule.spaced(Duration(100))
        )
        .collect((either) =>
          either.isRight() ? Option.some(either.right) : Option.none
        )
        .runCollect()
        .map((chunk) => List.from(chunk).flatten())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(data.toArray())
    })
  })
})

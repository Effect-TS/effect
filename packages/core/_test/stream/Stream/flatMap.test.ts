import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { constFalse, constVoid, identity } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { HasScope, Scope } from "../../../src/io/Scope"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("flatMap", () => {
    it("deep flatMap stack safety", async () => {
      function fib(n: number): Stream<unknown, never, number> {
        return n <= 1
          ? Stream.succeed(n)
          : fib(n - 1).flatMap((a) => fib(n - 2).flatMap((b) => Stream.succeed(a + b)))
      }

      const program = fib(20).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([6765])
    })

    it("left identity", async () => {
      const x = 0
      const f = (n: number) => Stream(n, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: Stream(x)
          .flatMap(f)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: f(x)
          .runCollect()
          .map((chunk) => chunk.toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("right identity", async () => {
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .flatMap((i) => Stream(i))
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("associativity", async () => {
      const stream = Stream(1, 2, 3)
      const f = (_: number) => Stream(4, 5)
      const g = (_: number) => Stream(6, 7)
      const program = Effect.struct({
        actual: stream
          .flatMap(f)
          .flatMap(g)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream
          .flatMap((x) => f(x).flatMap(g))
          .runCollect()
          .map((chunk) => chunk.toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("inner finalizers", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (n: number) =>
              effects.update((list) => list.prepend(n))
        )
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch, push }) =>
          Stream(
            Stream.acquireReleaseWith(push(1), () => push(1)),
            Stream.fromEffect(push(2)),
            Stream.acquireReleaseWith(push(3), () => push(3)) >
              Stream.fromEffect(latch.succeed(undefined) > Effect.never)
          )
            .flatMap(identity)
            .runDrain()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([3, 3, 2, 1, 1])
    })

    it("finalizer ordering 1", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.prepend(label))
        )
        .bindValue("stream", ({ push }) =>
          Stream.acquireReleaseWith(push("open1"), () => push("close1")).flatMap(() =>
            Stream.fromChunks(Chunk(undefined), Chunk(undefined))
              .tap(() => push("use2"))
              .ensuring(push("close2"))
              .flatMap(() =>
                Stream.acquireReleaseWith(push("open3"), () => push("close3")).flatMap(
                  () =>
                    Stream.fromChunks(Chunk(undefined), Chunk(undefined))
                      .tap(() => push("use4"))
                      .ensuring(push("close4"))
                )
              )
          )
        )
        .tap(({ stream }) => stream.runDrain())
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.reverse().toArray()).toEqual([
        "open1",
        "use2",
        "open3",
        "use4",
        "use4",
        "close4",
        "close3",
        "use2",
        "open3",
        "use4",
        "use4",
        "close4",
        "close3",
        "close2",
        "close1"
      ])
    })

    it("finalizer ordering 2", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.prepend(label))
        )
        .bindValue("stream", ({ push }) =>
          Stream.fromChunks(Chunk(1), Chunk(2))
            .tap(() => push("use2"))
            .flatMap(() =>
              Stream.acquireReleaseWith(push("open3"), () => push("close3"))
            )
        )
        .tap(({ stream }) => stream.runDrain())
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.reverse().toArray()).toEqual([
        "use2",
        "open3",
        "close3",
        "use2",
        "open3",
        "close3"
      ])
    })

    it("exit signal", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(constFalse))
        .bindValue("inner", ({ ref }) =>
          Stream.acquireReleaseExitWith(Effect.unit, (_, exit) =>
            exit.fold(
              () => ref.set(true),
              () => Effect.unit
            )
          ).flatMap(() => Stream.fail("ouch"))
        )
        .tap(({ inner }) =>
          Stream.succeed(constVoid)
            .flatMap(() => inner)
            .runDrain()
            .either()
            .asUnit()
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("finalizers are registered in the proper order", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bindValue(
          "push",
          ({ ref }) =>
            (n: number) =>
              ref.update((list) => list.prepend(n))
        )
        .bindValue(
          "stream",
          ({ push }) => Stream.finalizer(push(1)) > Stream.finalizer(push(2))
        )
        .tap(({ stream }) => Effect.scoped(stream.toPull().flatten()))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2])
    })

    it("early release finalizer concatenation is preserved", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bindValue(
          "push",
          ({ ref }) =>
            (n: number) =>
              ref.update((list) => list.prepend(n))
        )
        .bindValue(
          "stream",
          ({ push }) => Stream.finalizer(push(1)) > Stream.finalizer(push(2))
        )
        .flatMap(({ ref, stream }) =>
          Scope.make.flatMap((scope) =>
            stream
              .toPull()
              .provideService(HasScope)(scope)
              .flatMap((pull) => pull > scope.close(Exit.unit) > ref.get())
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2])
    })
  })
})

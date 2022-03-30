import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { constTrue, identity } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { IllegalArgumentException, RuntimeError } from "../../../src/io/Cause"
import type { IO, UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import type { Fiber } from "../../../src/io/Fiber"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("exists", () => {
    it("determines whether any element satisfies the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.struct({
        result1: Effect.exists(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.exists(list, (n) => Effect.succeed(n > 5))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(true)
      expect(result2).toBe(false)
    })
  })

  describe("forAll", () => {
    it("determines whether all elements satisfy the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.struct({
        result1: Effect.forAll(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.forAll(list, (n) => Effect.succeed(n > 0))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(false)
      expect(result2).toBe(true)
    })
  })

  describe("iterate", () => {
    it("iterates with the specified effectual function", async () => {
      const program = Effect.iterate(100, (n) => n > 0)((n) => Effect.succeed(n - 1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("loop", () => {
    it("loops with the specified effectual function", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .tap(({ ref }) =>
          Effect.loop(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.append(n)))
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(0, 1, 2, 3, 4))
    })

    it("collects the results into a list", async () => {
      const program = Effect.loop(
        0,
        (n) => n < 5,
        (n) => n + 2
      )((n) => Effect.succeed(n * 3)).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([0, 6, 12])
    })
  })

  describe("loopDiscard", () => {
    it("loops with the specified effectual function", async () => {
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.loopDiscard(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(0, 1, 2, 3, 4))
    })
  })

  describe("replicate", () => {
    it("zero", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(0)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("negative", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(-2)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("positive", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(2)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([12, 12])
    })
  })

  describe("forEach", () => {
    it("returns the list of results", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEach(list, (n) => Effect.succeed(n + 1)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 3, 4, 5, 6, 7])
    })

    it("both evaluates effects and returns the list of results in the same order", async () => {
      const list = List("1", "2", "3")
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bind("result", ({ ref }) =>
          Effect.forEach(
            list,
            (s) =>
              ref.update((list) => list.append(s)) > Effect.succeed(Number.parseInt(s))
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get)

      const { effects, result } = await program.unsafeRunPromise()

      expect(effects).toEqual(list)
      expect(result).toEqual([1, 2, 3])
    })

    it("fails if one of the effects fails", async () => {
      const list = List("1", "h", "3")
      const program = Effect.forEach(list, (s) =>
        Effect.succeed(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw new IllegalArgumentException()
          }
          return n
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("forEachDiscard", () => {
    it("runs effects in order", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("can be run twice", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) =>
          Effect.forEachDiscard(list, (n) => ref.update((_) => _ + n))
        )
        .tap(({ effect }) => effect)
        .tap(({ effect }) => effect)
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(30)
    })
  })

  describe("forEach for Option", () => {
    it("succeeds with None given None", async () => {
      const program = Effect.forEachOption(Option.emptyOf<string>(), (s) =>
        Effect.succeed(s.length)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("succeeds with Some given Some", async () => {
      const program = Effect.forEachOption(Option.some("success"), (s) =>
        Effect.succeed(s.length)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(7))
    })

    it("fails if the optional effect fails", async () => {
      const program = Effect.forEachOption(Option.some("help"), (s) =>
        Effect.succeed(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw new IllegalArgumentException()
          }
          return n
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("forEachPar", () => {
    it("runs single task", async () => {
      const program = Effect.forEachPar(List(2), (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([4])
    })

    it("runs two tasks", async () => {
      const program = Effect.forEachPar(List(2, 3), (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([4, 6])
    })

    it("runs many tasks", async () => {
      const list = List.range(1, 100)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.map((n) => n * 2).toArray())
    })

    it("runs a task that fails", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.fail("boom") : Effect.succeed(n * 2)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("boom")
    })

    it("runs two failed tasks", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5
          ? Effect.fail("boom1")
          : n === 8
          ? Effect.fail("boom2")
          : Effect.succeed(n * 2)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(["boom1", "boom2"]).toContain(result)
    })

    it("runs a task that dies", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.dieMessage("boom") : Effect.succeed(n * 2)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })

    it("runs a task that is interrupted", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.interrupt : Effect.succeed(n * 2)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isInterrupted()).toBe(true)
    })

    it("runs a task that throws an unsuspended exception", async () => {
      const program = Effect.forEachPar(List(1), (n) =>
        Effect.succeed(() => {
          throw new Error(n.toString())
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new Error("1")))
    })

    it("returns results in the same order", async () => {
      const program = Effect.forEachPar(List("1", "2", "3"), (s) =>
        Effect.succeed(Number.parseInt(s))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns results in the same order for Chunk", async () => {
      const program = Effect.forEachPar(Chunk("1", "2", "3"), (s) =>
        Effect.succeed(Number.parseInt(s))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("runs effects in parallel", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(
            List(Effect.never, promise.succeed(undefined)),
            identity
          ).fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("runs effects in parallel for Chunk", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(
            List(Effect.never, promise.succeed(undefined), Effect.never),
            identity
          ).fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) =>
        n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("not odd")
    })

    it("interrupts effects on first failure", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise", () => Promise.make<never, void>())
        .bindValue("actions", ({ promise, ref }) =>
          List<Effect<unknown, string, number>>(
            Effect.never,
            Effect.succeed(1),
            Effect.fail("C"),
            (promise.await() > ref.set(true)).as(1)
          )
        )
        .bind("e", ({ actions }) => Effect.forEachPar(actions, identity).flip())
        .bind("v", ({ ref }) => ref.get)

      const { e, v } = await program.unsafeRunPromise()

      expect(e).toBe("C")
      expect(v).toBe(false)
    })

    it("does not kill fiber when forked on the parent scope", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", ({ ref }) =>
          Effect.forEachPar(List.range(1, 101), (n) => ref.update((_) => _ + 1).fork())
        )
        .tap(({ fibers }) => Effect.forEach(fibers, (fiber) => fiber.await()))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100)
    })
  })

  describe("forEachPar - parallelism", () => {
    it("returns the list of results in the appropriate order", async () => {
      const list = List(1, 2, 3)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n.toString()))
        .withParallelism(2)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["1", "2", "3"])
    })

    it("works on large lists", async () => {
      const n = 10
      const list = List.range(0, 100001)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n))
        .withParallelism(n)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("runs effects in parallel", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(List(Effect.never, promise.succeed(undefined)), identity)
            .withParallelism(2)
            .fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) =>
        n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")
      )
        .withParallelism(4)
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("not odd"))
    })

    it("interrupts effects on first failure", async () => {
      const actions = List<IO<string, number>>(
        Effect.never,
        Effect.succeed(1),
        Effect.fail("C")
      )
      const program = Effect.forEachPar(actions, identity).withParallelism(4).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("C"))
    })
  })

  describe("forEachParDiscard", () => {
    it("accumulates errors", async () => {
      function task(
        started: Ref<number>,
        trigger: Promise<never, void>,
        n: number
      ): IO<number, void> {
        return started
          .updateAndGet((n) => n + 1)
          .flatMap(
            (count) =>
              Effect.when(count === 3, trigger.succeed(undefined)) >
              trigger.await() >
              Effect.fail(n)
          )
      }

      const program = Effect.Do()
        .bind("started", () => Ref.make(0))
        .bind("trigger", () => Promise.make<never, void>())
        .flatMap(({ started, trigger }) =>
          Effect.forEachParDiscard(List.range(1, 4), (n) =>
            task(started, trigger, n).uninterruptible()
          ).foldCause(
            (cause) => cause.failures().toArray(),
            () => []
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("runs all effects for Chunk", async () => {
      const list = Chunk(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(list.toArray())
    })

    it("completes on empty input", async () => {
      const program = Effect.forEachParDiscard(List.empty(), () => Effect.unit).map(
        constTrue
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("forEachParDiscard - parallelism", () => {
    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) =>
            ref.update((list) => list.append(n))
          ).withParallelism(2)
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })
  })

  describe("forkAll", () => {
    it("returns the list of results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.forkAll(list)
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("happy-path", async () => {
      const list = List.range(1, 1001)
      const program = Effect.forkAll(list.map((n) => Effect.succeed(n)))
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("empty input", async () => {
      const program = Effect.forkAll(List.empty<UIO<number>>())
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("propagate failures", async () => {
      const boom = new Error()
      const fail = Effect.fail(boom)
      const program = Effect.forkAll(List(fail)).flatMap((fiber) => fiber.join().flip())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("propagates defects", async () => {
      const boom = new Error("boom")
      const die = Effect.die(boom)

      function joinDefect(fiber: Fiber<never, unknown>) {
        return fiber.join().sandbox().flip()
      }

      const program = Effect.Do()
        .bind("fiber1", () => Effect.forkAll(List(die)))
        .bind("fiber2", () => Effect.forkAll(List(die, Effect.succeed(42))))
        .bind("fiber3", () =>
          Effect.forkAll(List(die, Effect.succeed(42), Effect.never))
        )
        .bind("result1", ({ fiber1 }) =>
          joinDefect(fiber1).map((cause) => cause.untraced())
        )
        .bind("result2", ({ fiber2 }) =>
          joinDefect(fiber2).map((cause) => cause.untraced())
        )
        .bind("result3", ({ fiber3 }) =>
          joinDefect(fiber3).map((cause) => cause.untraced())
        )

      const { result1, result2, result3 } = await program.unsafeRunPromise()

      expect(result1.dieOption()).toEqual(Option.some(boom))
      expect(result2.dieOption()).toEqual(Option.some(boom))
      expect(result3.dieOption()).toEqual(Option.some(boom))
      expect(result3.isInterrupted()).toBe(true)
    })

    it("infers correctly", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.never)
        .bindValue("workers", ({ worker }) => List.repeat(worker, 4))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("infers correctly with error type", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.fail(new RuntimeError("fail")).forever())
        .bindValue("workers", ({ worker }) => List.repeat(worker, 4))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })
})

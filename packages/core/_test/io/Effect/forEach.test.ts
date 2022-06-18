import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("exists", () => {
    it("determines whether any element satisfies the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.struct({
        result1: Effect.exists(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.exists(list, (n) => Effect.succeed(n > 5))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      assert.isTrue(result1)
      assert.isFalse(result2)
    })
  })

  describe.concurrent("forAll", () => {
    it("determines whether all elements satisfy the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.struct({
        result1: Effect.forAll(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.forAll(list, (n) => Effect.succeed(n > 0))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      assert.isFalse(result1)
      assert.isTrue(result2)
    })
  })

  describe.concurrent("iterate", () => {
    it("iterates with the specified effectual function", async () => {
      const program = Effect.iterate(100, (n) => n > 0)((n) => Effect.succeed(n - 1))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })
  })

  describe.concurrent("loop", () => {
    it("loops with the specified effectual function", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .tap(({ ref }) =>
          Effect.loop(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.prepend(n)))
        )
        .flatMap(({ ref }) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == List(0, 1, 2, 3, 4))
    })

    it("collects the results into a list", async () => {
      const program = Effect.loop(
        0,
        (n) => n < 5,
        (n) => n + 2
      )((n) => Effect.succeed(n * 3))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 6, 12))
    })
  })

  describe.concurrent("loopDiscard", () => {
    it("loops with the specified effectual function", async () => {
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) =>
          Effect.loopDiscard(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.prepend(n)))
        )
        .flatMap((ref) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == List(0, 1, 2, 3, 4))
    })
  })

  describe.concurrent("replicate", () => {
    it("zero", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(0))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("negative", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(-2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("positive", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(12, 12))
    })
  })

  describe.concurrent("forEach", () => {
    it("returns the list of results", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEach(list, (n) => Effect.succeed(n + 1))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(2, 3, 4, 5, 6, 7))
    })

    it("both evaluates effects and returns the list of results in the same order", async () => {
      const list = List("1", "2", "3")
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<string>>(List.empty()))
        .bind("result", ({ ref }) =>
          Effect.forEach(
            list,
            (s) => ref.update((list) => list.prepend(s)) > Effect.succeed(Number.parseInt(s))
          ))
        .bind("effects", ({ ref }) => ref.get().map((list) => list.reverse))

      const { effects, result } = await program.unsafeRunPromise()

      assert.isTrue(effects == list)
      assert.isTrue(result == Chunk(1, 2, 3))
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
        }))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isDieType() && result.cause.value instanceof IllegalArgumentException
      )
    })
  })

  describe.concurrent("forEachDiscard", () => {
    it("runs effects in order", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) => Effect.forEachDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        .flatMap((ref) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == list)
    })

    it("can be run twice", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) => Effect.forEachDiscard(list, (n) => ref.update((_) => _ + n)))
        .tap(({ effect }) => effect)
        .tap(({ effect }) => effect)
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 30)
    })
  })

  describe.concurrent("forEach for Maybe", () => {
    it("succeeds with None given None", async () => {
      const program = Effect.forEachMaybe(Maybe.emptyOf<string>(), (s) => Effect.succeed(s.length))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("succeeds with Some given Some", async () => {
      const program = Effect.forEachMaybe(Maybe.some("success"), (s) => Effect.succeed(s.length))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(7))
    })

    it("fails if the optional effect fails", async () => {
      const program = Effect.forEachMaybe(Maybe.some("help"), (s) =>
        Effect.succeed(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw new IllegalArgumentException()
          }
          return n
        }))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isDieType() && result.cause.value instanceof IllegalArgumentException
      )
    })
  })

  describe.concurrent("forEachPar", () => {
    it("runs single task", async () => {
      const program = Effect.forEachPar(List(2), (n) => Effect.succeed(n * 2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.single(4))
    })

    it("runs two tasks", async () => {
      const program = Effect.forEachPar(List(2, 3), (n) => Effect.succeed(n * 2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(4, 6))
    })

    it("runs many tasks", async () => {
      const chunk = Chunk.range(1, 100)
      const program = Effect.forEachPar(chunk, (n) => Effect.succeed(n * 2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk.map((n) => n * 2))
    })

    it("runs a task that fails", async () => {
      const program = Effect.forEachPar(
        Chunk.range(1, 10),
        (n) => n === 5 ? Effect.fail("boom") : Effect.succeed(n * 2)
      )
        .flip()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "boom")
    })

    it("runs two failed tasks", async () => {
      const program = Effect.forEachPar(Chunk.range(1, 10), (n) =>
        n === 5
          ? Effect.fail("boom1")
          : n === 8
          ? Effect.fail("boom2")
          : Effect.succeed(n * 2)).flip()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === "boom1" || result === "boom2")
    })

    it("runs a task that dies", async () => {
      const program = Effect.forEachPar(
        Chunk.range(1, 10),
        (n) => n === 5 ? Effect.dieMessage("boom") : Effect.succeed(n * 2)
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
    })

    it("runs a task that is interrupted", async () => {
      const program = Effect.forEachPar(Chunk.range(1, 10), (n) => n === 5 ? Effect.interrupt : Effect.succeed(n * 2))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isInterrupted)
    })

    it("runs a task that throws an unsuspended exception", async () => {
      const program = Effect.forEachPar(List(1), (n) =>
        Effect.succeed(() => {
          throw new Error(n.toString())
        }))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isDieType() && result.cause.value instanceof Error &&
          result.cause.value.message === "1"
      )
    })

    it("returns results in the same order", async () => {
      const program = Effect.forEachPar(List("1", "2", "3"), (s) => Effect.succeed(Number.parseInt(s)))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("returns results in the same order for Chunk", async () => {
      const program = Effect.forEachPar(Chunk("1", "2", "3"), (s) => Effect.succeed(Number.parseInt(s)))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("runs effects in parallel", async () => {
      const program = Deferred.make<never, void>()
        .tap((deferred) =>
          Effect.forEachPar(
            List(Effect.never, deferred.succeed(undefined)),
            identity
          ).fork()
        )
        .flatMap((deferred) => deferred.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("runs effects in parallel for Chunk", async () => {
      const program = Deferred.make<never, void>()
        .tap((deferred) =>
          Effect.forEachPar(
            List(Effect.never, deferred.succeed(undefined), Effect.never),
            identity
          ).fork()
        )
        .flatMap((deferred) => deferred.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")).flip()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "not odd")
    })

    it("interrupts effects on first failure", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("deferred", () => Deferred.make<never, void>())
        .bindValue("actions", ({ deferred, ref }) =>
          List(
            Effect.never,
            Effect.succeed(1),
            Effect.fail("C"),
            (deferred.await() > ref.set(true)).as(1)
          ))
        .bind("e", ({ actions }) => Effect.forEachPar(actions, identity).flip())
        .bind("v", ({ ref }) => ref.get())

      const { e, v } = await program.unsafeRunPromise()

      assert.strictEqual(e, "C")
      assert.isFalse(v)
    })

    it("does not kill fiber when forked on the parent scope", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", ({ ref }) => Effect.forEachPar(Chunk.range(1, 100), (n) => ref.update((_) => _ + 1).fork()))
        .tap(({ fibers }) => Effect.forEach(fibers, (fiber) => fiber.await()))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 100)
    })
  })

  describe.concurrent("forEachPar - parallelism", () => {
    it("returns the list of results in the appropriate order", async () => {
      const list = List(1, 2, 3)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n.toString()))
        .withParallelism(2)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("1", "2", "3"))
    })

    it("works on large lists", async () => {
      const n = 10
      const chunk = Chunk.range(0, 100000)
      const program = Effect.forEachPar(chunk, (n) => Effect.succeed(n))
        .withParallelism(n)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk)
    })

    it("runs effects in parallel", async () => {
      const program = Deferred.make<never, void>()
        .tap((deferred) =>
          Effect.forEachPar(List(Effect.never, deferred.succeed(undefined)), identity)
            .withParallelism(2)
            .fork()
        )
        .flatMap((deferred) => deferred.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd"))
        .withParallelism(4)
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("not odd"))
    })

    it("interrupts effects on first failure", async () => {
      const actions = List(
        Effect.never,
        Effect.succeed(1),
        Effect.fail("C")
      )
      const program = Effect.forEachPar(actions, identity).withParallelism(4).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("C"))
    })
  })

  describe.concurrent("forEachParDiscard", () => {
    it("accumulates errors", async () => {
      function task(
        started: Ref<number>,
        trigger: Deferred<never, void>,
        n: number
      ): Effect.IO<number, void> {
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
        .bind("trigger", () => Deferred.make<never, void>())
        .flatMap(({ started, trigger }) =>
          Effect.forEachParDiscard(Chunk.range(1, 3), (n) => task(started, trigger, n).uninterruptible()).foldCause(
            (cause) => cause.failures,
            () => List.empty<number>()
          )
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == List(1, 2, 3))
    })

    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) => Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        .flatMap((ref) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == list)
    })

    it("runs all effects for Chunk", async () => {
      const list = Chunk(1, 2, 3, 4, 5)
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) => Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        .flatMap((ref) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == list)
    })

    it("completes on empty input", async () => {
      const program = Effect.forEachParDiscard(List.empty(), () => Effect.unit).map(
        constTrue
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })

  describe.concurrent("forEachParDiscard - parallelism", () => {
    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) => Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n))).withParallelism(2))
        .flatMap((ref) => ref.get().map((list) => list.reverse))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == list)
    })
  })

  describe.concurrent("forkAll", () => {
    it("returns the list of results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.forkAll(list)
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("happy-path", async () => {
      const chunk = Chunk.range(1, 1000)
      const program = Effect.forkAll(chunk.map((n) => Effect.succeed(n)))
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk)
    })

    it("empty input", async () => {
      const program = Effect.forkAll<never, never, List<Effect.UIO<number>>>(List.empty())
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("propagate failures", async () => {
      const boom = new Error()
      const fail = Effect.fail(boom)
      const program = Effect.forkAll(List(fail)).flatMap((fiber) => fiber.join().flip())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, boom)
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
        .bind("fiber3", () => Effect.forkAll(List(die, Effect.succeed(42), Effect.never)))
        .bind("result1", ({ fiber1 }) => joinDefect(fiber1).map((cause) => cause.untraced))
        .bind("result2", ({ fiber2 }) => joinDefect(fiber2).map((cause) => cause.untraced))
        .bind("result3", ({ fiber3 }) => joinDefect(fiber3).map((cause) => cause.untraced))

      const { result1, result2, result3 } = await program.unsafeRunPromise()

      assert.isTrue(result1.dieMaybe == Maybe.some(boom))
      assert.isTrue(result2.dieMaybe == Maybe.some(boom))
      assert.isTrue(result3.dieMaybe == Maybe.some(boom))
      assert.isTrue(result3.isInterrupted)
    })

    it("infers correctly", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.never)
        .bindValue("workers", ({ worker }) => Chunk.fill(4, () => worker))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("infers correctly with error type", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.fail(new RuntimeError("fail")).forever())
        .bindValue("workers", ({ worker }) => Chunk.fill(4, () => worker))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })
  })
})

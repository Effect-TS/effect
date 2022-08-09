describe.concurrent("Effect", () => {
  describe.concurrent("exists", () => {
    it("determines whether any element satisfies the effectual predicate", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const result1 = $(Effect.exists(list, (n) => Effect.sync(n > 3)))
        const result2 = $(Effect.exists(list, (n) => Effect.sync(n > 5)))
        assert.isTrue(result1)
        assert.isFalse(result2)
      }).unsafeRunPromise())
  })

  describe.concurrent("forAll", () => {
    it("determines whether all elements satisfy the effectual predicate", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5, 6)
        const result1 = $(Effect.forAll(list, (n) => Effect.sync(n > 3)))
        const result2 = $(Effect.forAll(list, (n) => Effect.sync(n > 0)))
        assert.isFalse(result1)
        assert.isTrue(result2)
      }).unsafeRunPromise())
  })

  describe.concurrent("iterate", () => {
    it("iterates with the specified effectual function", () =>
      Do(($) => {
        const result = $(Effect.iterate(100, (n) => n > 0)((n) => Effect.sync(n - 1)))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())
  })

  describe.concurrent("loop", () => {
    it("loops with the specified effectual function", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        $(
          Effect.loop(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.prepend(n)))
        )
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == List(0, 1, 2, 3, 4))
      }).unsafeRunPromise())

    it("collects the results into a list", () =>
      Do(($) => {
        const result = $(
          Effect.loop(
            0,
            (n) => n < 5,
            (n) => n + 2
          )((n) => Effect.sync(n * 3))
        )
        assert.isTrue(result == Chunk(0, 6, 12))
      }).unsafeRunPromise())
  })

  describe.concurrent("loopDiscard", () => {
    it("loops with the specified effectual function", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        $(
          Effect.loopDiscard(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.prepend(n)))
        )
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == List(0, 1, 2, 3, 4))
      }).unsafeRunPromise())
  })

  describe.concurrent("replicate", () => {
    it("zero", () =>
      Do(($) => {
        const result = $(Effect.collectAll(Effect.sync(12).replicate(0)))
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it("negative", () =>
      Do(($) => {
        const result = $(Effect.collectAll(Effect.sync(12).replicate(-2)))
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it("positive", () =>
      Do(($) => {
        const result = $(Effect.collectAll(Effect.sync(12).replicate(2)))
        assert.isTrue(result == Chunk(12, 12))
      }).unsafeRunPromise())
  })

  describe.concurrent("forEach", () => {
    it("returns the list of results", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5, 6)
        const result = $(Effect.forEach(list, (n) => Effect.sync(n + 1)))
        assert.isTrue(result == Chunk(2, 3, 4, 5, 6, 7))
      }).unsafeRunPromise())

    it("both evaluates effects and returns the list of results in the same order", () =>
      Do(($) => {
        const list = List("1", "2", "3")
        const ref = $(Ref.make(List.empty<string>()))
        const result = $(Effect.forEach(
          list,
          (s) => ref.update((list) => list.prepend(s)).zipRight(Effect.sync(Number.parseInt(s)))
        ))
        const effects = $(ref.get.map((list) => list.reverse))
        assert.isTrue(effects == list)
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("fails if one of the effects fails", () =>
      Do(($) => {
        const list = List("1", "h", "3")
        const result = $(
          Effect.forEach(list, (s) =>
            Effect.sync(() => {
              const n = Number.parseInt(s)
              if (Number.isNaN(n)) {
                throw new IllegalArgumentException()
              }
              return n
            })).exit
        )
        assert.isTrue(
          result.isFailure() && result.cause.isDieType() &&
            result.cause.value instanceof IllegalArgumentException
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("forEachDiscard", () => {
    it("runs effects in order", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const ref = $(Ref.make(List.empty<number>()))
        $(Effect.forEachDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == list)
      }).unsafeRunPromise())

    it("can be run twice", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const ref = $(Ref.make(0))
        const effect = Effect.forEachDiscard(list, (n) => ref.update((_) => _ + n))
        $(effect)
        $(effect)
        const result = $(ref.get)
        assert.strictEqual(result, 30)
      }).unsafeRunPromise())
  })

  describe.concurrent("forEach for Maybe", () => {
    it("succeeds with None given None", () =>
      Do(($) => {
        const result = $(Effect.forEachMaybe(Maybe.empty<string>(), (s) => Effect.sync(s.length)))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("succeeds with Some given Some", () =>
      Do(($) => {
        const result = $(Effect.forEachMaybe(Maybe.some("success"), (s) => Effect.sync(s.length)))
        assert.isTrue(result == Maybe.some(7))
      }).unsafeRunPromise())

    it("fails if the optional effect fails", () =>
      Do(($) => {
        const result = $(
          Effect.forEachMaybe(Maybe.some("help"), (s) =>
            Effect.sync(() => {
              const n = Number.parseInt(s)
              if (Number.isNaN(n)) {
                throw new IllegalArgumentException()
              }
              return n
            })).exit
        )
        assert.isTrue(
          result.isFailure() && result.cause.isDieType() &&
            result.cause.value instanceof IllegalArgumentException
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("forEachPar", () => {
    it("runs single task", () =>
      Do(($) => {
        const result = $(Effect.forEachPar(List(2), (n) => Effect.sync(n * 2)))
        assert.isTrue(result == Chunk.single(4))
      }).unsafeRunPromise())

    it("runs two tasks", () =>
      Do(($) => {
        const result = $(Effect.forEachPar(List(2, 3), (n) => Effect.sync(n * 2)))
        assert.isTrue(result == Chunk(4, 6))
      }).unsafeRunPromise())

    it("runs many tasks", () =>
      Do(($) => {
        const chunk = Chunk.range(1, 100)
        const result = $(Effect.forEachPar(chunk, (n) => Effect.sync(n * 2)))
        assert.isTrue(result == chunk.map((n) => n * 2))
      }).unsafeRunPromise())

    it("runs a task that fails", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(
            Chunk.range(1, 10),
            (n) => n === 5 ? Effect.failSync("boom") : Effect.sync(n * 2)
          ).flip
        )
        assert.strictEqual(result, "boom")
      }).unsafeRunPromise())

    it("runs two failed tasks", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(Chunk.range(1, 10), (n) =>
            n === 5
              ? Effect.failSync("boom1")
              : n === 8
              ? Effect.failSync("boom2")
              : Effect.sync(n * 2)).flip
        )
        assert.isTrue(result === "boom1" || result === "boom2")
      }).unsafeRunPromise())

    it("runs a task that dies", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(
            Chunk.range(1, 10),
            (n) => n === 5 ? Effect.dieMessage("boom") : Effect.sync(n * 2)
          ).exit
        )
        assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
      }).unsafeRunPromiseExit())

    it("runs a task that is interrupted", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(
            Chunk.range(1, 10),
            (n) => n === 5 ? Effect.interrupt : Effect.sync(n * 2)
          ).exit
        )
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromiseExit())

    it("runs a task that throws an unsuspended exception", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(List(1), (n) =>
            Effect.sync(() => {
              throw new Error(n.toString())
            })).exit
        )
        assert.isTrue(
          result.isFailure() && result.cause.isDieType() && result.cause.value instanceof Error &&
            result.cause.value.message === "1"
        )
      }).unsafeRunPromiseExit())

    it("returns results in the same order", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(List("1", "2", "3"), (s) => Effect.sync(Number.parseInt(s)))
        )
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("returns results in the same order for Chunk", () =>
      Do(($) => {
        const result = $(
          Effect.forEachPar(Chunk("1", "2", "3"), (s) => Effect.sync(Number.parseInt(s)))
        )
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("runs effects in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(
          Effect.forEachPar(
            List(Effect.never, deferred.succeed(undefined)),
            identity
          ).fork
        )
        const result = $(deferred.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("runs effects in parallel for Chunk", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(
          Effect.forEachPar(
            List(Effect.never, deferred.succeed(undefined), Effect.never),
            identity
          ).fork
        )
        const result = $(deferred.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("propagates error", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5, 6)
        const result = $(
          Effect
            .forEachPar(list, (n) => n % 2 !== 0 ? Effect.sync(n) : Effect.failSync("not odd"))
            .flip
        )
        assert.strictEqual(result, "not odd")
      }).unsafeRunPromise())

    it("interrupts effects on first failure", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const deferred = $(Deferred.make<never, void>())
        const actions = List(
          Effect.never,
          Effect.sync(1),
          Effect.failSync("C"),
          deferred.await.zipRight(ref.set(true)).as(1)
        )
        const error = $(Effect.forEachPar(actions, identity).flip)
        const value = $(ref.get)
        assert.strictEqual(error, "C")
        assert.isFalse(value)
      }).unsafeRunPromise())

    it("does not kill fiber when forked on the parent scope", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const fibers = $(
          Effect.forEachPar(Chunk.range(1, 100), () => ref.update((_) => _ + 1).fork)
        )
        $(Effect.forEach(fibers, (fiber) => fiber.await))
        const result = $(ref.get)
        assert.strictEqual(result, 100)
      }).unsafeRunPromise())
  })

  describe.concurrent("forEachPar - parallelism", () => {
    it("returns the list of results in the appropriate order", () =>
      Do(($) => {
        const list = List(1, 2, 3)
        const result = $(
          Effect.forEachPar(list, (n) => Effect.sync(n.toString())).withParallelism(2)
        )
        assert.isTrue(result == Chunk("1", "2", "3"))
      }).unsafeRunPromise())

    it("works on large lists", () =>
      Do(($) => {
        const n = 10
        const chunk = Chunk.range(0, 100000)
        const result = $(Effect.forEachPar(chunk, (n) => Effect.sync(n)).withParallelism(n))
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("runs effects in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(
          Effect.forEachPar(List(Effect.never, deferred.succeed(undefined)), identity)
            .withParallelism(2)
            .fork
        )
        const result = $(deferred.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("propagates error", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5, 6)
        const result = $(
          Effect.forEachPar(list, (n) => n % 2 !== 0 ? Effect.sync(n) : Effect.failSync("not odd"))
            .withParallelism(4)
            .either
        )
        assert.isTrue(result == Either.left("not odd"))
      }).unsafeRunPromise())

    it("interrupts effects on first failure", () =>
      Do(($) => {
        const actions = List(
          Effect.never,
          Effect.sync(1),
          Effect.failSync("C")
        )
        const result = $(Effect.forEachPar(actions, identity).withParallelism(4).either)
        assert.isTrue(result == Either.left("C"))
      }).unsafeRunPromise())
  })

  describe.concurrent("forEachParDiscard", () => {
    it("accumulates errors", () =>
      Do(($) => {
        function task(
          started: Ref<number>,
          trigger: Deferred<never, void>,
          n: number
        ): Effect<never, number, void> {
          return started
            .updateAndGet((n) => n + 1)
            .flatMap((count) =>
              Effect.when(count === 3, trigger.succeed(undefined))
                .zipRight(trigger.await)
                .zipRight(Effect.failSync(n))
            )
        }
        const started = $(Ref.make(0))
        const trigger = $(Deferred.make<never, void>())
        const result = $(
          Effect.forEachParDiscard(
            Chunk.range(1, 3),
            (n) => task(started, trigger, n).uninterruptible
          ).foldCause(
            (cause) => cause.failures,
            () => List.empty<number>()
          )
        )
        assert.isTrue(result == List(1, 2, 3))
      }).unsafeRunPromise())

    it("runs all effects", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const ref = $(Ref.make(List.empty<number>()))
        $(Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == list)
      }).unsafeRunPromise())

    it("runs all effects for Chunk", () =>
      Do(($) => {
        const list = Chunk(1, 2, 3, 4, 5)
        const ref = $(Ref.make<List<number>>(List.empty()))
        $(Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n))))
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == list)
      }).unsafeRunPromise())

    it("completes on empty input", () =>
      Do(($) => {
        const result = $(Effect.forEachParDiscard(List.empty(), () => Effect.unit))
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("forEachParDiscard - parallelism", () => {
    it("runs all effects", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const ref = $(Ref.make(List.empty<number>()))
        $(
          Effect.forEachParDiscard(list, (n) => ref.update((list) => list.prepend(n)))
            .withParallelism(2)
        )
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == list)
      }).unsafeRunPromise())
  })

  describe.concurrent("forkAll", () => {
    it("returns the list of results in the same order", () =>
      Do(($) => {
        const list = List(1, 2, 3).map((n) => Effect.sync(n))
        const result = $(Effect.forkAll(list).flatMap((fiber) => fiber.join))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("happy-path", () =>
      Do(($) => {
        const chunk = Chunk.range(1, 1000)
        const result = $(
          Effect.forkAll(chunk.map((n) => Effect.sync(n))).flatMap((fiber) => fiber.join)
        )
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("empty input", () =>
      Do(($) => {
        const result = $(
          Effect.forkAll(List.empty<Effect<never, never, number>>()).flatMap((fiber) => fiber.join)
        )
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it("propagate failures", () =>
      Do(($) => {
        const boom = new Error()
        const fail = Effect.failSync(boom)
        const result = $(Effect.forkAll(List(fail)).flatMap((fiber) => fiber.join.flip))
        assert.strictEqual(result, boom)
      }).unsafeRunPromise())

    it("propagates defects", () =>
      Do(($) => {
        const boom = new Error("boom")
        const die = Effect.dieSync(boom)
        function joinDefect(fiber: Fiber<never, unknown>) {
          return fiber.join.sandbox.flip
        }
        const fiber1 = $(Effect.forkAll(List(die)))
        const fiber2 = $(Effect.forkAll(List(die, Effect.sync(42))))
        const fiber3 = $(Effect.forkAll(List(die, Effect.sync(42), Effect.never)))
        const result1 = $(joinDefect(fiber1).map((cause) => cause))
        const result2 = $(joinDefect(fiber2).map((cause) => cause))
        const result3 = $(joinDefect(fiber3).map((cause) => cause))
        assert.isTrue(result1.dieMaybe == Maybe.some(boom))
        assert.isTrue(result2.dieMaybe == Maybe.some(boom))
        assert.isTrue(result3.dieMaybe == Maybe.some(boom))
        assert.isTrue(result3.isInterrupted)
      }).unsafeRunPromise())

    it("infers correctly", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const worker = Effect.never
        const workers = Chunk.fill(4, () => worker)
        const fiber = $(Effect.forkAll(workers))
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("infers correctly with error type", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const worker = Effect.failSync(new RuntimeError("fail")).forever
        const workers = Chunk.fill(4, () => worker)
        const fiber = $(Effect.forkAll(workers))
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())
  })
})

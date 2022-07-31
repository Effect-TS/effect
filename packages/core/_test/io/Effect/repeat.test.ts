import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("repeatUntil", () => {
    it("repeatUntil repeats until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatUntil(
            (n) => n === 0
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("repeatUntil always evaluates effect at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).repeatUntil(constTrue))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("repeatUntilEquals", () => {
    it("repeatUntilEquals repeats until result is equal to predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make<number>(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).repeatUntilEquals(Equivalence.number, 5)
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })
  })

  describe.concurrent("repeatUntilEffect", () => {
    it("repeats until the effectful condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatUntilEffect((n) => Effect.sync(n === 0))
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).repeatUntilEffect(() => Effect.sync(true)))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("repeatWhile", () => {
    it("repeats while the condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatWhile(
            (n) => n >= 0
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 11)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).repeatWhile(constFalse))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("repeatWhileEquals", () => {
    it("repeats while the result equals the predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make<number>(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).repeatWhileEquals(Equivalence.number, 0)
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })
  })

  describe.concurrent("repeatWhileEffect", () => {
    it("repeats while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatWhileEffect((v) => Effect.sync(v >= 0))
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 11)
    })

    it("always evaluates effect at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).repeatWhileEffect(() => Effect.sync(false)))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})

import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("retryUntil", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntil((n) => n === 0)
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("runs at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).flipWith((effect) => effect.retryUntil(constTrue)))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("retryUntilEquals", () => {
    it("retries until error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make<number>(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).flipWith((effect) => effect.retryUntilEquals(Equivalence.number)(5))
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })
  })

  describe.concurrent("retryUntilEffect", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntilEffect((n) => Effect.succeed(n === 0))
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("runs at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryUntilEffect(() => Effect.succeed(true)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("retryWhile", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhile((n) => n >= 0)
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 11)
    })

    it("runs at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) => ref.update((n) => n + 1).flipWith((effect) => effect.retryWhile(constFalse)))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("retryWhileEquals", () => {
    it("retries while error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make<number>(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).flipWith((effect) => effect.retryWhileEquals(Equivalence.number)(0))
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })
  })

  describe.concurrent("retryWhileEffect", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make<number>(10))
        .bind("output", () => Ref.make<number>(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhileEffect((n) => Effect.succeed(n >= 0))
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 11)
    })

    it("runs at least once", async () => {
      const program = Ref.make<number>(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryWhileEffect(() => Effect.succeed(false)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})

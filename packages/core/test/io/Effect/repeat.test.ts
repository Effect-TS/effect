import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("repeatUntil", () => {
    it("repeatUntil repeats until condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1).zipLeft(output.update((n) => n + 1))
            .repeatUntil((n) => n === 0)
        )
        const result = $(output.get)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("repeatUntil always evaluates effect at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).repeatUntil(constTrue))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatUntilEquals", () => {
    it("repeatUntilEquals repeats until result is equal to predicate", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const queue = $(Queue.unbounded<number>())
        $(queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        $(queue.take.zipLeft(ref.update((n) => n + 1)).repeatUntilEquals(Equivalence.number, 5))
        const result = $(ref.get)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatUntilEffect", () => {
    it("repeats until the effectful condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1)
            .zipLeft(output.update((n) => n + 1))
            .repeatUntilEffect((n) => Effect.sync(n === 0))
        )
        const result = $(output.get)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("always evaluates the effect at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).repeatUntilEffect(() => Effect.succeed(true)))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatWhile", () => {
    it("repeats while the condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1)
            .zipLeft(output.update((n) => n + 1))
            .repeatWhile((n) => n >= 0)
        )
        const result = $(output.get)
        assert.strictEqual(result, 11)
      }).unsafeRunPromise())

    it("always evaluates the effect at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).repeatWhile(constFalse))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatWhileEquals", () => {
    it("repeats while the result equals the predicate", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const queue = $(Queue.unbounded<number>())
        $(queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        $(queue.take.zipLeft(ref.update((n) => n + 1)).repeatWhileEquals(Equivalence.number, 0))
        const result = $(ref.get)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatWhileEffect", () => {
    it("repeats while condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1)
            .zipLeft(output.update((n) => n + 1))
            .repeatWhileEffect((v) => Effect.sync(v >= 0))
        )
        const result = $(output.get)
        assert.strictEqual(result, 11)
      }).unsafeRunPromise())

    it("always evaluates effect at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).repeatWhileEffect(() => Effect.sync(false)))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})

import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("retryUntil", () => {
    it("retries until condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input
            .updateAndGet((n) => n - 1)
            .zipLeft(output.update((n) => n + 1))
            .flipWith((effect) => effect.retryUntil((n) => n === 0))
        )
        const result = $(output.get)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("runs at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).flipWith((effect) => effect.retryUntil(constTrue)))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("retryUntilEquals", () => {
    it("retries until error equals predicate", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const queue = $(Queue.unbounded<number>())
        $(queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        $(
          queue.take
            .zipLeft(ref.update((n) => n + 1))
            .flipWith((effect) => effect.retryUntilEquals(Equivalence.number, 5))
        )
        const result = $(ref.get)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())
  })

  describe.concurrent("retryUntilEffect", () => {
    it("retries until condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1).zipLeft(output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntilEffect((n) => Effect.sync(n === 0))
          )
        )
        const result = $(output.get)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("runs at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(
          ref.update((n) => n + 1)
            .flipWith((effect) => effect.retryUntilEffect(() => Effect.sync(true)))
        )
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("retryWhile", () => {
    it("retries while condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1).zipLeft(output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhile((n) => n >= 0)
          )
        )
        const result = $(output.get)
        assert.strictEqual(result, 11)
      }).unsafeRunPromise())

    it("runs at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).flipWith((effect) => effect.retryWhile(constFalse)))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("retryWhileEquals", () => {
    it("retries while error equals predicate", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const queue = $(Queue.unbounded<number>())
        $(queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        $(
          queue.take.zipLeft(ref.update((n) => n + 1)).flipWith((effect) =>
            effect.retryWhileEquals(Equivalence.number, 0)
          )
        )
        const result = $(ref.get)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())
  })

  describe.concurrent("retryWhileEffect", () => {
    it("retries while condition is true", () =>
      Do(($) => {
        const input = $(Ref.make(10))
        const output = $(Ref.make(0))
        $(
          input.updateAndGet((n) => n - 1).zipLeft(output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhileEffect((n) => Effect.sync(n >= 0))
          )
        )
        const result = $(output.get)
        assert.strictEqual(result, 11)
      }).unsafeRunPromise())

    it("runs at least once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(
          ref.update((n) => n + 1)
            .flipWith((effect) => effect.retryWhileEffect(() => Effect.sync(false)))
        )
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})

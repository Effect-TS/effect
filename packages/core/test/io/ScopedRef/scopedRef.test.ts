import { Counter } from "@effect/core/test/io/ScopedRef/test-utils"

describe.concurrent("ScopedRef", () => {
  describe.concurrent("setting", () => {
    it("single set", () =>
      Effect.scoped(Do(($) => {
        const counter = $(Counter.make())
        const ref = $(ScopedRef.make(0))
        $(ref.set(counter.acquire))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      })).unsafeRunPromise())

    it("dual set", () =>
      Effect.scoped(Do(($) => {
        const counter = $(Counter.make())
        const ref = $(ScopedRef.make(0))
        $(ref.set(counter.acquire).zipRight(ref.set(counter.acquire)))
        const result = $(ref.get)
        assert.strictEqual(result, 2)
      })).unsafeRunPromise())
  })

  describe.concurrent("releasing", () => {
    it("release on swap", () =>
      Effect.scoped(Do(($) => {
        const counter = $(Counter.make())
        const ref = $(ScopedRef.make(0))
        $(ref.set(counter.acquire).zipRight(ref.set(counter.acquire)))
        const acquired = $(counter.acquired)
        const released = $(counter.released)
        assert.strictEqual(acquired, 2)
        assert.strictEqual(released, 1)
      })).unsafeRunPromise())

    it("double release on double swap", () =>
      Effect.scoped(Do(($) => {
        const counter = $(Counter.make())
        const ref = $(ScopedRef.make(0))
        $(
          ref.set(counter.acquire)
            .zipRight(ref.set(counter.acquire))
            .zipRight(ref.set(counter.acquire))
        )
        const acquired = $(counter.acquired)
        const released = $(counter.released)
        assert.strictEqual(acquired, 3)
        assert.strictEqual(released, 2)
      })).unsafeRunPromise())

    it("full release", () =>
      Do(($) => {
        const counter = $(Counter.make())
        $(
          Effect.scoped(
            ScopedRef.make(0).flatMap((ref) =>
              ref.set(counter.acquire)
                .zipRight(ref.set(counter.acquire))
                .zipRight(ref.set(counter.acquire))
            )
          )
        )
        const acquired = $(counter.acquired)
        const released = $(counter.released)
        assert.strictEqual(acquired, 3)
        assert.strictEqual(released, 3)
      }).unsafeRunPromise())
  })
})

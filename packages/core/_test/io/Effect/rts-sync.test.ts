import { ExampleError, fib, sum } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS synchronous correctness", () => {
    it("succeed must be lazy", async () => {
      let program
      try {
        program = Effect.sync(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.sync(true)
      } catch {
        program = Effect.sync(false)
      }

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("suspend must be lazy", async () => {
      let program
      try {
        program = Effect.suspend(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.sync(true)
      } catch {
        program = Effect.sync(false)
      }

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("suspendSucceed must be evaluatable", () =>
      Do(($) => {
        const result = $(Effect.suspendSucceed(Effect.sync(42)))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("suspendSucceed must not catch throwable", () =>
      Do(($) => {
        const error = new Error("woops")
        const result = $(
          Effect.suspendSucceed<never, unknown, unknown>(() => {
            throw error
          }).sandbox.either.map((either) => either.mapLeft((cause) => cause))
        )
        assert.isTrue(result == Either.left(Cause.die(error)))
      }).unsafeRunPromise())

    it("suspend must catch throwable", () =>
      Do(($) => {
        const error = new Error("woops")
        const result = $(
          Effect.suspend<never, unknown, unknown>(() => {
            throw error
          }).either
        )
        assert.isTrue(result == Either.left(error))
      }).unsafeRunPromise())

    it("point, bind, map", () =>
      Do(($) => {
        function fibEffect(n: number): Effect<never, never, number> {
          if (n <= 1) {
            return Effect.sync(n)
          }
          return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
        }
        const result = $(fibEffect(10))
        assert.strictEqual(result, fib(10))
      }).unsafeRunPromise())

    it("effect, bind, map", () =>
      Do(($) => {
        function fibEffect(n: number): Effect<never, unknown, number> {
          if (n <= 1) {
            return Effect.attempt(n)
          }
          return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
        }
        const result = $(fibEffect(10))
        assert.strictEqual(result, fib(10))
      }).unsafeRunPromise())

    it("effect, bind, map, redeem", () =>
      Do(($) => {
        function fibEffect(n: number): Effect<never, unknown, number> {
          if (n <= 1) {
            return Effect.attempt(() => {
              throw ExampleError
            }).catchAll(() => Effect.attempt(n))
          }
          return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
        }
        const result = $(fibEffect(10))
        assert.strictEqual(result, fib(10))
      }).unsafeRunPromise())

    it("sync effect", () =>
      Do(($) => {
        function sumEffect(n: number): Effect<never, unknown, number> {
          if (n < 0) {
            return Effect.sync(0)
          }
          return Effect.sync(n).flatMap((b) => sumEffect(n - 1).map((a) => a + b))
        }
        const result = $(sumEffect(1000))
        assert.strictEqual(result, sum(1000))
      }).unsafeRunPromise())

    it("deep effects", () =>
      Do(($) => {
        function incLeft(n: number, ref: Ref<number>): Effect<never, never, number> {
          if (n <= 0) {
            return ref.get
          }
          return incLeft(n - 1, ref) < ref.update((n) => n + 1)
        }

        function incRight(n: number, ref: Ref<number>): Effect<never, never, number> {
          if (n <= 0) {
            return ref.get
          }
          return ref.update((n) => n + 1) > incRight(n - 1, ref)
        }
        const left = Ref.make(0).flatMap((ref) => incLeft(100, ref)).map((n) => n === 0)
        const right = Ref.make(0).flatMap((ref) => incRight(1000, ref)).map((n) => n === 1000)
        const result = $(left.zipWith(right, (a, b) => a && b))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("flip must make error into value", () =>
      Do(($) => {
        const result = $(Effect.failSync(ExampleError).flip)
        assert.deepEqual(result, ExampleError)
      }).unsafeRunPromise())

    it("flip must make value into error", () =>
      Do(($) => {
        const result = $(Effect.sync(42).flip.either)
        assert.isTrue(result == Either.left(42))
      }).unsafeRunPromise())

    it("flipping twice returns the identical value", () =>
      Do(($) => {
        const result = $(Effect.sync(42).flip.flip)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())
  })
})

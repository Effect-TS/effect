import { Either } from "../../../src/data/Either"
import { Cause } from "../../../src/io/Cause"
import type { UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { ExampleError, fib, sum } from "./test-utils"

describe("Effect", () => {
  describe("RTS synchronous correctness", () => {
    it("succeed must be lazy", async () => {
      let program
      try {
        program = Effect.succeed(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.succeed(true)
      } catch {
        program = Effect.succeed(false)
      }

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("suspend must be lazy", async () => {
      let program
      try {
        program = Effect.suspend(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.succeed(true)
      } catch {
        program = Effect.succeed(false)
      }

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("suspendSucceed must be evaluatable", async () => {
      const program = Effect.suspendSucceed(Effect.succeed(42))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("suspendSucceed must not catch throwable", async () => {
      const program = Effect.suspendSucceed(() => {
        throw new Error("woops")
      })
        .sandbox()
        .either()
        .map((either) => either.mapLeft((cause) => cause.untraced()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Cause.die(new Error("woops"))))
    })

    it("suspend must catch throwable", async () => {
      const error = new Error("woops")
      const program = Effect.suspend(() => {
        throw error
      }).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })

    it("suspendWith must catch throwable", async () => {
      const error = new Error("woops")
      const program = Effect.suspendWith(() => {
        throw error
      }).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })

    it("point, bind, map", async () => {
      function fibEffect(n: number): UIO<number> {
        if (n <= 1) {
          return Effect.succeed(n)
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("effect, bind, map", async () => {
      function fibEffect(n: number): Effect<unknown, unknown, number> {
        if (n <= 1) {
          return Effect.attempt(n)
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("effect, bind, map, redeem", async () => {
      function fibEffect(n: number): Effect<unknown, unknown, number> {
        if (n <= 1) {
          return Effect.attempt(() => {
            throw ExampleError
          }).catchAll(() => Effect.attempt(n))
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("sync effect", async () => {
      function sumEffect(n: number): Effect<unknown, unknown, number> {
        if (n < 0) {
          return Effect.succeed(0)
        }
        return Effect.succeed(n).flatMap((b) => sumEffect(n - 1).map((a) => a + b))
      }

      const result = await sumEffect(1000).unsafeRunPromise()

      expect(result).toBe(sum(1000))
    })

    it("deep effects", async () => {
      function incLeft(n: number, ref: Ref<number>): UIO<number> {
        if (n <= 0) {
          return ref.get
        }
        return incLeft(n - 1, ref) < ref.update((n) => n + 1)
      }

      function incRight(n: number, ref: Ref<number>): UIO<number> {
        if (n <= 0) {
          return ref.get
        }
        return ref.update((n) => n + 1) > incRight(n - 1, ref)
      }

      const left = Ref.make(0)
        .flatMap((ref) => incLeft(100, ref))
        .map((n) => n === 0)
      const right = Ref.make(0)
        .flatMap((ref) => incRight(1000, ref))
        .map((n) => n === 1000)
      const program = left.zipWith(right, (a, b) => a && b)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("flip must make error into value", async () => {
      const program = Effect.fail(ExampleError).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(ExampleError)
    })

    it("flip must make value into error", async () => {
      const program = Effect.succeed(42).flip().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(42))
    })

    it("flipping twice returns the identical value", async () => {
      const program = Effect.succeed(42).flip().flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })
})

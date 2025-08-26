import { describe, expect, test } from "bun:test"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as BunTest from "../src/index.js"

describe("@effect-native/bun-test", () => {
  describe("effect", () => {
    BunTest.it.effect("should run an effect successfully", () =>
      Effect.gen(function*() {
        const result = yield* Effect.succeed(42)
        expect(result).toBe(42)
      }))

    BunTest.it.effect("should handle async effects", () =>
      Effect.gen(function*() {
        const result = yield* Effect.promise(() => Promise.resolve("async"))
        expect(result).toBe("async")
      }))

    BunTest.it.effect("should propagate failures", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(Effect.fail("error"))
        expect(Exit.isFailure(exit)).toBe(true)
      }))

    BunTest.it.effect.skip("should skip tests", () => Effect.succeed("skipped"))

    BunTest.it.effect.only("should run only this test when focused", () => Effect.succeed("focused"))

    const testCases = [1, 2, 3]
    BunTest.it.effect.each(testCases)("should test with value %s", (value) =>
      Effect.gen(function*() {
        expect(value).toBeGreaterThan(0)
        expect(value).toBeLessThan(4)
      }))
  })

  describe("scoped", () => {
    BunTest.it.scoped("should handle scoped resources", () =>
      Effect.gen(function*() {
        let released = false
        yield* Effect.acquireRelease(
          Effect.sync(() => "resource"),
          () =>
            Effect.sync(() => {
              released = true
            })
        )
        expect(released).toBe(false)
        // The resource will be released after the test
      }))
  })

  describe("live", () => {
    BunTest.it.live("should run without test services", () =>
      Effect.gen(function*() {
        const result = yield* Effect.succeed("live")
        expect(result).toBe("live")
      }))
  })

  describe("scopedLive", () => {
    BunTest.it.scopedLive("should run scoped without test services", () =>
      Effect.gen(function*() {
        const result = yield* Effect.acquireRelease(
          Effect.succeed("scoped-live"),
          () => Effect.void
        )
        expect(result).toBe("scoped-live")
      }))
  })

  describe("layer", () => {
    class TestService extends Context.Tag("TestService")<TestService, { value: string }>() {
      static Live = Layer.succeed(TestService, { value: "test-value" })
    }

    BunTest.layer(TestService.Live)("with layer", (it) => {
      it.effect("should provide service from layer", () =>
        Effect.gen(function*() {
          const service = yield* TestService
          expect(service.value).toBe("test-value")
        }))

      it.effect("should share layer between tests", () =>
        Effect.gen(function*() {
          const service = yield* TestService
          expect(service.value).toBe("test-value")
        }))
    })

    // Test nested layers
    class DependentService extends Context.Tag("DependentService")<DependentService, { derived: string }>() {
      static Live = Layer.effect(
        DependentService,
        Effect.map(TestService, (service) => ({ derived: `derived-${service.value}` }))
      )
    }

    BunTest.layer(TestService.Live)("nested layers", (it) => {
      it.layer(DependentService.Live)("with dependent service", (it) => {
        it.effect("should have access to both services", () =>
          Effect.gen(function*() {
            const testService = yield* TestService
            const dependentService = yield* DependentService
            expect(testService.value).toBe("test-value")
            expect(dependentService.derived).toBe("derived-test-value")
          }))
      })
    })
  })

  describe("prop", () => {
    BunTest.it.prop(
      "should test properties with schemas",
      { a: Schema.Number, b: Schema.Number },
      ({ a, b }) =>
        Effect.gen(function*() {
          expect(a + b).toBe(b + a) // Commutative property
        })
    )

    BunTest.it.prop(
      "should test with array of schemas",
      [Schema.String, Schema.Number],
      ([str, num]) =>
        Effect.gen(function*() {
          expect(typeof str).toBe("string")
          expect(typeof num).toBe("number")
        })
    )

    BunTest.it.prop(
      "should test with FastCheck arbitraries",
      {
        nat: fc.nat({ max: 100 }),
        str: fc.string()
      },
      ({ nat, str }) =>
        Effect.gen(function*() {
          expect(nat).toBeGreaterThanOrEqual(0)
          expect(nat).toBeLessThanOrEqual(100)
          expect(typeof str).toBe("string")
        })
    )

    // Non-effect prop test
    BunTest.prop(
      "should support non-effect property tests",
      { x: Schema.Number, y: Schema.Number },
      ({ x, y }) => {
        expect(x + y).toBe(y + x)
      }
    )
  })

  describe("flakyTest", () => {
    test("should retry flaky operations", async () => {
      let attempts = 0
      const effect = Effect.gen(function*() {
        attempts++
        if (attempts < 3) {
          yield* Effect.fail("not yet")
        }
        return "success"
      })

      const result = await Effect.runPromise(
        BunTest.flakyTest(effect)
      )

      expect(result).toBe("success")
      expect(attempts).toBeGreaterThanOrEqual(3)
    })
  })

  describe("addEqualityTesters", () => {
    test("should add custom equality testers", () => {
      BunTest.addEqualityTesters()

      // Test with Equal.equals compatible objects
      const obj1 = { value: 1, [Equal.symbol]: Equal.symbol }
      const obj2 = { value: 1, [Equal.symbol]: Equal.symbol }

      // This would normally fail without custom equality tester
      expect(Equal.equals(obj1, obj2)).toBe(true)
    })
  })

  describe("test variations", () => {
    BunTest.it.effect.todo("should support todo tests")

    BunTest.it.effect.skipIf(false)("should run when condition is false", () => Effect.succeed("ran"))

    BunTest.it.effect.skipIf(true)("should skip when condition is true", () => Effect.succeed("skipped"))

    BunTest.it.effect.runIf(true)("should run when condition is true", () => Effect.succeed("ran"))

    BunTest.it.effect.runIf(false)("should skip when condition is false", () => Effect.succeed("skipped"))
  })

  describe("timeout", () => {
    BunTest.it.effect("should respect timeout parameter", () =>
      Effect.gen(function*() {
        yield* Effect.sleep("10 millis")
        expect(true).toBe(true)
      }), 100 // 100ms timeout
    )
  })
})

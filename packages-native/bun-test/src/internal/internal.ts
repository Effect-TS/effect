/**
 * @since 0.1.0
 */
// Conditional import based on runtime environment
let B: any
try {
  // This will work in Bun
  B = require("bun:test")
} catch {
  // Fallback for other environments (like Node.js during docgen)
  B = {
    test: Object.assign(() => {}, {
      skip: () => {},
      only: () => {},
      failing: () => {},
      todo: () => {}
    }),
    describe: () => {},
    afterAll: () => {},
    expect: Object.assign(() => ({}), {
      prototype: { toEqual: () => {} }
    })
  }
}
import * as Arbitrary from "effect/Arbitrary"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import * as Utils from "effect/Utils"
import type * as BunTest from "../index.js"

/**
 * Executes an Effect and returns a Promise that resolves to the result or throws an error.
 * Handles interruption and multiple errors gracefully.
 *
 * @internal
 */
const runPromise = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exit = yield* Effect.exit(effect)
    if (Exit.isSuccess(exit)) {
      return () => exit.value
    } else {
      if (Cause.isInterruptedOnly(exit.cause)) {
        return () => {
          throw new Error("All fibers interrupted without errors.")
        }
      }
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 1; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
      return () => {
        throw errors[0]
      }
    }
  }).pipe(Effect.runPromise).then((f) => f())

/**
 * Runs a test Effect by converting it to a Promise.
 *
 * @internal
 */
const runTest = <E, A>(effect: Effect.Effect<A, E>) => runPromise(effect)

/**
 * Test environment layer that provides TestContext without default logging.
 *
 * @internal
 */
const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger))
)

/**
 * Custom equality tester for Effect data types that implement Equal.
 * Returns true if values are equal, false if not, undefined if not applicable.
 *
 * @internal
 */
function customTester(a: unknown, b: unknown): boolean | undefined {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }
  return Utils.structuralRegion(
    () => Equal.equals(a, b),
    (x, y) => {
      // Bun's expect doesn't have the same API as vitest, so we use a simpler comparison
      if (x === y) return true
      if (x == null || y == null) return false
      if (typeof x !== "object" || typeof y !== "object") return x === y

      const keysX = Object.keys(x)
      const keysY = Object.keys(y)
      if (keysX.length !== keysY.length) return false

      for (const key of keysX) {
        if (!keysY.includes(key)) return false
        if (!customTester((x as any)[key], (y as any)[key])) return false
      }
      return true
    }
  )
}

/**
 * Extends Bun's expect with custom equality checking for Effect's Equal instances.
 * This allows proper comparison of Option, Either, and other Effect data types.
 *
 * @internal
 */
export const addEqualityTesters = () => {
  // Bun doesn't have addEqualityTesters, but we can extend expect
  const originalToEqual = B.expect.prototype.toEqual
  B.expect.prototype.toEqual = function(expected: unknown) {
    const actual = (this as any).value
    const result = customTester(actual, expected)
    if (result !== undefined) {
      if (!result) {
        throw new Error(`Expected values to be equal`)
      }
      return this
    }
    return originalToEqual.call(this, expected)
  }
}

/**
 * Factory function for creating test runners with different execution contexts.
 * Handles all test modifiers (skip, only, etc.) and property-based testing.
 *
 * @internal
 */
const makeTester = <R>(
  mapEffect: (self: Effect.Effect<any, any, any>) => Effect.Effect<any, any, never>
): any => {
  const run = <A, E, TestArgs extends Array<unknown>>(
    args: TestArgs,
    self: BunTest.BunTest.TestFunction<A, E, R, TestArgs>
  ) => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest)

  const f: BunTest.BunTest.Test<R> = (name, self, timeout) => B.test(name, () => run([], self), timeout)

  const skip: BunTest.BunTest.Tester<R>["skip"] = (name, self, timeout) =>
    B.test.skip(name, () => run([], self), timeout)

  const skipIf = (condition: unknown) => {
    if (condition) {
      return skip
    }
    return f
  }

  const runIf = (condition: unknown) => {
    if (condition) {
      return f
    }
    return skip
  }

  const only: BunTest.BunTest.Tester<R>["only"] = (name, self, timeout) =>
    B.test.only(name, () => run([], self), timeout)

  const each =
    <T>(cases: ReadonlyArray<T>) =>
    <A, E>(name: string, self: BunTest.BunTest.TestFunction<A, E, R, [T]>, timeout?: number) => {
      cases.forEach((testCase, index) => {
        B.test(`${name} [${index}]`, () => run([testCase], self), timeout)
      })
    }

  const failing: BunTest.BunTest.Tester<R>["failing"] = (name, self, timeout) =>
    B.test.failing(name, () => run([], self), timeout)

  const todo: BunTest.BunTest.Tester<R>["todo"] = (name) => B.test.todo(name)

  const prop: any = (name: string, arbitraries: any, self: any, options?: any) => {
    const timeout = typeof options === "number" ? options : options?.timeout
    const params = typeof options === "object" ? options.fastCheck : undefined

    B.test(name, async () => {
      const arbs: Record<string, fc.Arbitrary<any>> = {}
      const entries = Array.isArray(arbitraries)
        ? arbitraries.map((arb, i) => [i, arb])
        : Object.entries(arbitraries)

      for (const [key, arb] of entries) {
        if (Schema.isSchema(arb)) {
          arbs[key] = Arbitrary.make(arb)
        } else {
          arbs[key] = arb
        }
      }

      const property = fc.property(
        ...Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>],
        (...values: Array<any>) => {
          const props = Array.isArray(arbitraries)
            ? values
            : Object.keys(arbitraries).reduce((acc, key, i) => {
              acc[key] = values[i]
              return acc
            }, {} as any)

          return pipe(
            Effect.suspend(() => self(props)),
            mapEffect,
            runTest
          ) as any
        }
      )

      await fc.assert(property, params as any)
    }, timeout)
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, failing, todo, prop }) as any
}

/**
 * Test runner that provides TestServices (TestClock, TestRandom, etc.) for deterministic testing.
 *
 * @internal
 */
export const effect = makeTester((effect: Effect.Effect<any, any, any>) =>
  Effect.provide(effect, TestEnv) as Effect.Effect<any, any, never>
)

/**
 * Test runner that provides TestServices and automatic resource management via Scope.
 *
 * @internal
 */
export const scoped = makeTester(
  (effect: Effect.Effect<any, any, any>) =>
    Effect.scoped(effect).pipe(Effect.provide(TestEnv)) as Effect.Effect<any, any, never>
)

/**
 * Test runner for integration tests without TestServices.
 *
 * @internal
 */
export const live = makeTester((effect: Effect.Effect<any, any, any>) => effect as Effect.Effect<any, any, never>)

/**
 * Test runner for integration tests with resource management but without TestServices.
 *
 * @internal
 */
export const scopedLive = makeTester((effect: Effect.Effect<any, any, any>) =>
  Effect.scoped(effect) as Effect.Effect<any, any, never>
)

/**
 * Retries a flaky test up to 100 times or until timeout.
 * Uses exponential backoff with jitter for retry delays.
 *
 * @internal
 */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.DurationInput = Duration.seconds(30)
) => {
  const policy = pipe(
    Schedule.recurs(100),
    Schedule.compose(Schedule.elapsed),
    Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
  )
  return Effect.retry(self, policy) as Effect.Effect<A, never, R>
}

/**
 * Creates a test suite with a shared Layer that's initialized once and reused across tests.
 * Supports nested layers and automatic cleanup after all tests complete.
 *
 * @internal
 */
export const layer = <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
  }
): {
  (f: (it: BunTest.BunTest.Methods<R>) => void): void
  (name: string, f: (it: BunTest.BunTest.Methods<R>) => void): void
} => {
  const withTestEnv = Layer.provideMerge(layer_, TestEnv)
  const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap)
  const scope = Effect.runSync(Scope.make())
  const runtimeEffect = Layer.toRuntimeWithMemoMap(withTestEnv, memoMap).pipe(
    Scope.extend(scope),
    Effect.orDie,
    Effect.cached,
    Effect.runSync
  )

  const teardown = () => {
    Effect.runSync(Scope.close(scope, Exit.void))
  }

  const methods: any = {
    effect: makeTester((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) => effect.pipe(Effect.provide(runtime))) as any
    ),
    scoped: makeTester((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(runtime)
        )) as any
    ),
    live: makeTester((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) => effect.pipe(Effect.provide(runtime))) as any
    ),
    scopedLive: makeTester((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(runtime)
        )) as any
    ),
    flakyTest,
    layer: <R2, E2>(innerLayer: Layer.Layer<R2, E2, R>, innerOptions?: any) => {
      const combined = Layer.provideMerge(innerLayer, withTestEnv)
      return layer(combined, { ...options, ...innerOptions, memoMap })
    },
    prop: (name: string, arbitraries: any, self: any, propOptions?: any) => {
      const timeout = typeof propOptions === "number" ? propOptions : propOptions?.timeout
      const params = typeof propOptions === "object" ? propOptions.fastCheck : undefined

      B.test(name, async () => {
        await Effect.runPromise(runtimeEffect) // Initialize the layer
        const arbs: Record<string, fc.Arbitrary<any>> = {}
        const entries = Array.isArray(arbitraries)
          ? arbitraries.map((arb, i) => [i, arb])
          : Object.entries(arbitraries)

        for (const [key, arb] of entries) {
          if (Schema.isSchema(arb)) {
            arbs[key] = Arbitrary.make(arb)
          } else {
            arbs[key] = arb
          }
        }

        const property = fc.property(
          ...Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>],
          (...values: Array<any>) => {
            const props = Array.isArray(arbitraries)
              ? values
              : Object.keys(arbitraries).reduce((acc, key, i) => {
                acc[key] = values[i]
                return acc
              }, {} as any)

            self(props)
          }
        )

        await fc.assert(property, params as any)
      }, timeout)
    }
  }

  return function(
    nameOrF: string | ((it: BunTest.BunTest.Methods<R>) => void),
    f?: (it: BunTest.BunTest.Methods<R>) => void
  ) {
    if (typeof nameOrF === "string") {
      B.describe(nameOrF, () => {
        f!(methods)
        B.afterAll(teardown)
      })
    } else {
      nameOrF(methods)
      B.afterAll(teardown)
    }
  }
}

/**
 * Property-based testing using FastCheck.
 * Automatically converts Schema to Arbitrary and runs multiple test cases.
 *
 * @internal
 */
export const prop: any = (name: string, arbitraries: any, self: any, options?: any) => {
  const timeout = typeof options === "number" ? options : options?.timeout
  const params = typeof options === "object" ? options.fastCheck : undefined

  B.test(name, async () => {
    const arbs: Record<string, fc.Arbitrary<any>> = {}
    const entries = Array.isArray(arbitraries)
      ? arbitraries.map((arb, i) => [i, arb])
      : Object.entries(arbitraries)

    for (const [key, arb] of entries) {
      if (Schema.isSchema(arb)) {
        arbs[key as string] = Arbitrary.make(arb)
      } else {
        arbs[key as string] = arb as fc.Arbitrary<any>
      }
    }

    const property = fc.property(
      ...(Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>]),
      (...values: Array<any>) => {
        const props = Array.isArray(arbitraries)
          ? values
          : Object.keys(arbitraries).reduce((acc, key, i) => {
            acc[key] = values[i]
            return acc
          }, {} as any)

        self(props)
      }
    )

    await fc.assert(property, params)
  }, timeout)
}

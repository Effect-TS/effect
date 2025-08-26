/**
 * @since 0.1.0
 */
import * as B from "bun:test"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FC from "effect/FastCheck"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"
import * as internal from "./internal/internal.js"

export const afterAll = B.afterAll
export const afterEach = B.afterEach
export const beforeAll = B.beforeAll
export const beforeEach = B.beforeEach
export const describe = B.describe
export const expect = B.expect
export const jest = B.jest
export const mock = B.mock
export const setDefaultTimeout = B.setDefaultTimeout
export const setSystemTime = B.setSystemTime
export const spyOn = B.spyOn
export const test = B.test

/**
 * Re-exports all types from Bun's test module.
 *
 * @since 0.1.0
 * @category types
 */
export type * from "bun:test"

/**
 * Main namespace containing all BunTest types and interfaces.
 *
 * @since 0.1.0
 * @category types
 */
export namespace BunTest {
  /**
   * A test function that returns an Effect.
   *
   * @since 0.1.0
   * @category types
   * @example
   * ```ts
   * const myTest: TestFunction<void, never, never, []> = () =>
   *   Effect.sync(() => {
   *     expect(1).toBe(1)
   *   })
   * ```
   */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /**
   * Basic test interface for creating Effect-based tests.
   *
   * @since 0.1.0
   * @category types
   * @example
   * ```ts
   * const test: Test<never> = (name, effect) => {
   *   // Implementation
   * }
   * ```
   */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, []>,
      timeout?: number
    ): void
  }

  /**
   * Type for property-based testing arbitraries.
   * Can be an array or object of Schema or FastCheck arbitraries.
   *
   * @since 0.1.0
   * @category property testing
   * @example
   * ```ts
   * import * as Schema from "effect/Schema"
   * import * as fc from "effect/FastCheck"
   *
   * // Array form
   * const arbs1: Arbitraries = [Schema.Number, fc.string()]
   *
   * // Object form
   * const arbs2: Arbitraries = {
   *   age: Schema.Number,
   *   name: fc.string()
   * }
   * ```
   */
  export type Arbitraries =
    | Array<Schema.Schema.Any | FC.Arbitrary<any>>
    | { [K in string]: Schema.Schema.Any | FC.Arbitrary<any> }

  /**
   * Extended test interface with modifiers and utilities.
   *
   * @since 0.1.0
   * @category types
   */
  export interface Tester<R> extends BunTest.Test<R> {
    /**
     * Skips a test.
     *
     * @example
     * ```ts
     * it.skip("pending feature", () => Effect.void)
     * ```
     */
    skip: BunTest.Test<R>

    /**
     * Conditionally skips a test.
     *
     * @example
     * ```ts
     * it.skipIf(process.platform === "win32")("unix test", () => Effect.void)
     * ```
     */
    skipIf: (condition: unknown) => BunTest.Test<R>

    /**
     * Conditionally runs a test.
     *
     * @example
     * ```ts
     * it.runIf(process.env.CI)("CI only test", () => Effect.void)
     * ```
     */
    runIf: (condition: unknown) => BunTest.Test<R>

    /**
     * Runs only this test (useful for debugging).
     *
     * @example
     * ```ts
     * it.only("focus on this", () => Effect.void)
     * ```
     */
    only: BunTest.Test<R>

    /**
     * Runs a test for each provided test case.
     *
     * @example
     * ```ts
     * it.each([1, 2, 3])("test with %d", (num) =>
     *   Effect.sync(() => expect(num).toBeGreaterThan(0))
     * )
     * ```
     */
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, [T]>, timeout?: number) => void

    /**
     * Marks a test as expected to fail.
     *
     * @example
     * ```ts
     * it.failing("known bug", () => Effect.die("bug"))
     * ```
     */
    failing: BunTest.Test<R>

    /**
     * Marks a test as todo.
     *
     * @example
     * ```ts
     * it.todo("implement later", () => Effect.void)
     * ```
     */
    todo: BunTest.Test<R>

    /**
     * Property-based testing using FastCheck.
     *
     * @since 0.1.0
     * @example
     * ```ts
     * import * as Schema from "effect/Schema"
     *
     * it.prop(
     *   "addition is commutative",
     *   { a: Schema.Number, b: Schema.Number },
     *   ({ a, b }) => Effect.sync(() => {
     *     expect(a + b).toBe(b + a)
     *   })
     * )
     * ```
     */
    prop: <const Arbs extends Arbitraries, A, E>(
      name: string,
      arbitraries: Arbs,
      self: TestFunction<
        A,
        E,
        R,
        [{ [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }]
      >,
      timeout?: number | {
        timeout?: number
        fastCheck?: FC.Parameters<
          { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
        >
      }
    ) => void
  }

  /**
   * Complete test methods interface including Effect-based testing utilities.
   *
   * @since 0.1.0
   * @category types
   */
  export interface Methods<R = never> {
    /**
     * Creates Effect-based tests with TestServices automatically provided.
     *
     * @example
     * ```ts
     * it.effect("test with TestContext", () =>
     *   Effect.gen(function* () {
     *     yield* TestClock.adjust(Duration.hours(1))
     *     // test time-dependent code
     *   })
     * )
     * ```
     */
    readonly effect: BunTest.Tester<TestServices.TestServices | R>

    /**
     * Retries a flaky test until it succeeds or times out.
     *
     * @example
     * ```ts
     * it.effect("flaky network test", () =>
     *   flakyTest(
     *     fetchData(),
     *     Duration.seconds(30)
     *   )
     * )
     * ```
     */
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>

    /**
     * Creates scoped Effect-based tests with TestServices.
     *
     * @example
     * ```ts
     * it.scoped("resource test", () =>
     *   Effect.gen(function* () {
     *     const resource = yield* acquireResource
     *     // test with resource, automatically cleaned up
     *   })
     * )
     * ```
     */
    readonly scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope | R>

    /**
     * Creates Effect-based tests without TestServices.
     *
     * @example
     * ```ts
     * it.live("production test", () =>
     *   Effect.gen(function* () {
     *     // test with real services
     *   })
     * )
     * ```
     */
    readonly live: BunTest.Tester<R>

    /**
     * Creates scoped Effect-based tests without TestServices.
     *
     * @example
     * ```ts
     * it.scopedLive("production resource test", () =>
     *   Effect.gen(function* () {
     *     const resource = yield* acquireResource
     *     // test with real resource
     *   })
     * )
     * ```
     */
    readonly scopedLive: BunTest.Tester<Scope.Scope | R>

    /**
     * Shares a Layer across multiple tests.
     *
     * @example
     * ```ts
     * it.layer(DatabaseLayer)("database tests", (it) => {
     *   it.effect("query test", () => ...)
     *   it.effect("update test", () => ...)
     * })
     * ```
     */
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) => {
      (f: (it: BunTest.Methods<R | R2>) => void): void
      (name: string, f: (it: BunTest.Methods<R | R2>) => void): void
    }

    /**
     * Property-based testing without Effect.
     *
     * @since 0.1.0
     * @example
     * ```ts
     * it.prop(
     *   "array reverse twice equals original",
     *   { arr: Schema.Array(Schema.Number) },
     *   ({ arr }) => {
     *     expect(arr.reverse().reverse()).toEqual(arr)
     *   }
     * )
     * ```
     */
    readonly prop: <const Arbs extends Arbitraries>(
      name: string,
      arbitraries: Arbs,
      self: (
        properties: { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
      ) => void,
      timeout?: number | {
        timeout?: number
        fastCheck?: FC.Parameters<
          { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
        >
      }
    ) => void
  }
}

/**
 * Adds custom equality testers to Bun's expect for Effect data types.
 * This enables proper equality checking for Effect's Equal instances.
 *
 * @since 0.1.0
 * @category testing utilities
 * @example
 * ```ts
 * import { addEqualityTesters, expect } from "@effect-native/bun-test"
 * import { Option } from "effect"
 *
 * addEqualityTesters()
 *
 * expect(Option.some(1)).toEqual(Option.some(1)) // passes
 * ```
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * Creates Effect-based tests with TestServices (TestClock, TestRandom, etc.) automatically provided.
 * Use this for testing time-dependent code or code that needs deterministic randomness.
 *
 * @since 0.1.0
 * @category testing
 * @example
 * ```ts
 * import { effect, expect } from "@effect-native/bun-test"
 * import { Effect, TestClock, Duration } from "effect"
 *
 * effect("time-dependent test", () =>
 *   Effect.gen(function* () {
 *     const start = yield* Clock.currentTimeMillis
 *     yield* TestClock.adjust(Duration.hours(1))
 *     const end = yield* Clock.currentTimeMillis
 *     expect(end - start).toBe(Duration.toMillis(Duration.hours(1)))
 *   })
 * )
 * ```
 */
export const effect: BunTest.Tester<TestServices.TestServices> = internal.effect

/**
 * Creates scoped Effect-based tests with TestServices.
 * Resources are automatically acquired and released.
 *
 * @since 0.1.0
 * @category testing
 * @example
 * ```ts
 * import { scoped, expect } from "@effect-native/bun-test"
 * import { Effect } from "effect"
 *
 * scoped("resource management", () =>
 *   Effect.gen(function* () {
 *     const resource = yield* Effect.acquireRelease(
 *       Effect.sync(() => ({ value: "acquired" })),
 *       () => Effect.log("released")
 *     )
 *     expect(resource.value).toBe("acquired")
 *     // resource automatically released after test
 *   })
 * )
 * ```
 */
export const scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope> = internal.scoped

/**
 * Creates Effect-based tests without TestServices.
 * Use this for integration tests with real services.
 *
 * @since 0.1.0
 * @category testing
 * @example
 * ```ts
 * import { live, expect } from "@effect-native/bun-test"
 * import { Effect } from "effect"
 *
 * live("real service test", () =>
 *   Effect.gen(function* () {
 *     const result = yield* fetchFromRealAPI()
 *     expect(result.status).toBe(200)
 *   })
 * )
 * ```
 */
export const live: BunTest.Tester<never> = internal.live

/**
 * Creates scoped Effect-based tests without TestServices.
 * Use this for integration tests with real resources that need cleanup.
 *
 * @since 0.1.0
 * @category testing
 * @example
 * ```ts
 * import { scopedLive, expect } from "@effect-native/bun-test"
 * import { Effect } from "effect"
 *
 * scopedLive("database connection test", () =>
 *   Effect.gen(function* () {
 *     const db = yield* Effect.acquireRelease(
 *       connectToDatabase(),
 *       (db) => db.close()
 *     )
 *     const result = yield* db.query("SELECT 1")
 *     expect(result).toBeDefined()
 *   })
 * )
 * ```
 */
export const scopedLive = internal.scopedLive as BunTest.Tester<Scope.Scope>

/**
 * Share a `Layer` between multiple tests, optionally wrapping
 * the tests in a `describe` block if a name is provided.
 *
 * @since 0.1.0
 *
 * ```ts
 * import { expect, layer } from "@effect-native/bun-test"
 * import { Context, Effect, Layer } from "effect"
 *
 * class Foo extends Context.Tag("Foo")<Foo, "foo">() {
 *   static Live = Layer.succeed(Foo, "foo")
 * }
 *
 * class Bar extends Context.Tag("Bar")<Bar, "bar">() {
 *   static Live = Layer.effect(
 *     Bar,
 *     Effect.map(Foo, () => "bar" as const)
 *   )
 * }
 *
 * layer(Foo.Live)("layer", (it) => {
 *   it.effect("adds context", () =>
 *     Effect.gen(function* () {
 *       const foo = yield* Foo
 *       expect(foo).toEqual("foo")
 *     })
 *   )
 *
 *   it.layer(Bar.Live)("nested", (it) => {
 *     it.effect("adds context", () =>
 *       Effect.gen(function* () {
 *         const foo = yield* Foo
 *         const bar = yield* Bar
 *         expect(foo).toEqual("foo")
 *         expect(bar).toEqual("bar")
 *       })
 *     )
 *   })
 * })
 * ```
 */
export const layer: <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
  }
) => {
  (f: (it: BunTest.Methods<R>) => void): void
  (name: string, f: (it: BunTest.Methods<R>) => void): void
} = internal.layer

/**
 * Retries a potentially flaky test until it succeeds or times out.
 * Useful for tests that may fail due to timing or external factors.
 *
 * @since 0.1.0
 * @category testing utilities
 * @example
 * ```ts
 * import { effect, flakyTest } from "@effect-native/bun-test"
 * import { Effect, Duration } from "effect"
 *
 * effect("unreliable network test", () =>
 *   flakyTest(
 *     Effect.gen(function* () {
 *       const response = yield* fetchWithRetry(url)
 *       expect(response.ok).toBe(true)
 *     }),
 *     Duration.seconds(30)
 *   )
 * )
 * ```
 */
export const flakyTest = internal.flakyTest

/**
 * Property-based testing using FastCheck.
 * Tests properties that should hold for all generated inputs.
 *
 * @since 0.1.0
 * @category property testing
 * @example
 * ```ts
 * import { prop } from "@effect-native/bun-test"
 * import * as Schema from "effect/Schema"
 *
 * prop(
 *   "string concatenation length",
 *   { a: Schema.String, b: Schema.String },
 *   ({ a, b }) => {
 *     expect((a + b).length).toBe(a.length + b.length)
 *   }
 * )
 * ```
 */
export const prop: BunTest.Methods["prop"] = internal.prop

/**
 * Collection of all test methods.
 *
 * @since 0.1.0
 * @category testing
 */
const methods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const

/**
 * Main test interface combining Bun's test with Effect utilities.
 * Provides all testing methods for Effect-based and property-based testing.
 *
 * @since 0.1.0
 * @category testing
 * @example
 * ```ts
 * import { it, expect } from "@effect-native/bun-test"
 * import { Effect } from "effect"
 *
 * // Standard test
 * it("basic test", () => {
 *   expect(1 + 1).toBe(2)
 * })
 *
 * // Effect test
 * it.effect("effect test", () =>
 *   Effect.sync(() => {
 *     expect(true).toBe(true)
 *   })
 * )
 *
 * // Property test
 * it.prop(
 *   "property test",
 *   { n: Schema.Number },
 *   ({ n }) => {
 *     expect(n + 0).toBe(n)
 *   }
 * )
 * ```
 */
export const it = Object.assign(B.test, methods) as any as BunTest.Methods

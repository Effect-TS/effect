/**
 * Effect testing helpers for Bun's native `bun:test` runner.
 *
 * The API mirrors `@effect/vitest` (`it.effect`, `it.live`, `layer`,
 * `it.prop`, `flakyTest`, …) so Effect test suites can move between the two
 * runners without rewrites.
 *
 * @since 4.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"
import * as internal from "./internal/internal.ts"
import * as utils from "./utils.ts"

import * as bt from "bun:test"

/**
 * Re-exported primitives from Bun's built-in test runner.
 *
 * Bun does not currently support `export ... from "bun:test"`, so each symbol
 * is re-exported via a const binding.
 *
 * @since 4.0.0
 */
export const afterAll = bt.afterAll
/** @since 4.0.0 */
export const afterEach = bt.afterEach
/** @since 4.0.0 */
export const beforeAll = bt.beforeAll
/** @since 4.0.0 */
export const beforeEach = bt.beforeEach
/** @since 4.0.0 */
export const describe = bt.describe
/** @since 4.0.0 */
export const expect = bt.expect
/** @since 4.0.0 */
export const jest = bt.jest
/** @since 4.0.0 */
export const mock = bt.mock
/** @since 4.0.0 */
export const setSystemTime = bt.setSystemTime
/** @since 4.0.0 */
export const spyOn = bt.spyOn
/** @since 4.0.0 */
export const test = bt.test

/**
 * A chai-flavoured `assert` covering the surface `@effect/vitest` re-exports
 * from Vitest, so suites using `assert.strictEqual`, `assert.include`, … port
 * unchanged.
 *
 * @since 4.0.0
 */
export const assert: {
  readonly fail: (message: string) => void
  readonly strictEqual: <A>(actual: A, expected: A, message?: string) => void
  readonly deepStrictEqual: <A>(actual: A, expected: A, message?: string) => void
  readonly notDeepStrictEqual: <A>(actual: A, expected: A, message?: string) => void
  readonly isTrue: (self: unknown, message?: string) => void
  readonly isFalse: (self: boolean, message?: string) => void
  readonly include: (actual: string | ReadonlyArray<unknown> | undefined, expected: unknown) => void
  readonly match: (actual: string, regExp: RegExp) => void
  readonly instanceOf: (value: unknown, constructor: abstract new(...args: any) => any, message?: string) => void
  readonly isDefined: <A>(a: A | undefined) => void
  readonly isUndefined: <A>(a: A | undefined) => void
  readonly throws: (thunk: () => void, error?: Error | ((u: unknown) => undefined)) => void
  readonly doesNotThrow: (thunk: () => void, message?: string) => void
  readonly ok: (self: unknown, message?: string) => void
} = {
  fail: utils.fail,
  strictEqual: utils.strictEqual,
  deepStrictEqual: utils.deepStrictEqual,
  notDeepStrictEqual: utils.notDeepStrictEqual,
  isTrue: utils.assertTrue,
  isFalse: utils.assertFalse,
  include: utils.assertInclude,
  match: utils.assertMatch,
  instanceOf: utils.assertInstanceOf,
  isDefined: utils.assertDefined,
  isUndefined: utils.assertUndefined,
  throws: utils.throws,
  doesNotThrow: utils.doesNotThrow,
  ok: utils.assertTrue
}

/**
 * A stand-in for Vitest's `TestContext`. Bun's test runner doesn't pass a
 * context object to the test function, so the test wrapper synthesises one.
 *
 * The `signal` aborts when the wrapper-managed timeout fires, interrupting the
 * test's Effect fiber so its finalizers run — something Bun's own timeout
 * cannot do.
 *
 * @since 4.0.0
 */
export interface TestContext {
  readonly signal: AbortSignal
  onTestFinished(fn: () => void | Promise<void>): void
  onTestFailed(fn: () => void | Promise<void>): void
}

/**
 * Options accepted by every test registrar in this package.
 *
 * @since 4.0.0
 */
export interface TestOptions {
  readonly timeout?: number
  readonly retry?: number
  readonly repeats?: number
  readonly skip?: boolean
  readonly only?: boolean
  readonly todo?: boolean
  readonly fails?: boolean
}

/**
 * @since 4.0.0
 */
export type API = TestCollectorCallable

/**
 * @since 4.0.0
 */
export interface TestCollectorCallable {
  (
    name: string,
    fn: (ctx: TestContext) => unknown | Promise<unknown>,
    options?: number | TestOptions
  ): void
  (
    name: string,
    options: TestOptions,
    fn: (ctx: TestContext) => unknown | Promise<unknown>
  ): void
}

/**
 * A parameterized test registrar, mirroring `test.each`.
 *
 * @since 4.0.0
 */
export interface TestEach {
  <T>(cases: ReadonlyArray<T>): (
    name: string,
    fn: (value: T, ctx: TestContext) => unknown | Promise<unknown>,
    options?: number | TestOptions
  ) => void
}

/**
 * The full test collector surface: the callable registrar plus the chained
 * helpers (`skip`, `only`, `each`, `describe`, ...).
 *
 * @since 4.0.0
 */
export interface Collector extends TestCollectorCallable {
  readonly skip: TestCollectorCallable & { readonly each: TestEach }
  readonly only: TestCollectorCallable
  readonly todo: (name: string) => void
  readonly skipIf: (condition: unknown) => TestCollectorCallable
  readonly runIf: (condition: unknown) => TestCollectorCallable
  readonly fails: TestCollectorCallable
  readonly each: TestEach
  readonly describe: typeof bt.describe
}

/**
 * @since 4.0.0
 */
export namespace BunTest {
  /**
   * @since 4.0.0
   */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /**
   * @since 4.0.0
   */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, [TestContext]>,
      timeout?: number | TestOptions
    ): void
  }

  /**
   * @since 4.0.0
   */
  export type Arbitraries =
    | Array<Schema.Schema<any> | Arbitrary.Arbitrary<any>>
    | { [K in string]: Schema.Schema<any> | Arbitrary.Arbitrary<any> }

  type ArbitraryValue<A> = A extends Schema.Schema<infer T> ? T
    : A extends Arbitrary.Arbitrary<infer T> ? T
    : never

  /**
   * @since 4.0.0
   */
  export interface Tester<R> extends BunTest.Test<R> {
    skip: BunTest.Test<R>
    skipIf: (condition: unknown) => BunTest.Test<R>
    runIf: (condition: unknown) => BunTest.Test<R>
    only: BunTest.Test<R>
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | TestOptions) => void
    fails: BunTest.Test<R>

    /**
     * Runs an Effectful property test using Schema or Arbitrary inputs.
     *
     * **Details**
     *
     * Returning `false` or completing with any non-interruption failure falsifies the property and triggers shrinking.
     * This includes typed Effect failures, thrown exceptions, and defects such as failed assertions. Effect
     * interruption continues to interrupt the test.
     *
     * The wrapper-managed timeout interrupts the Effect fiber running generation, property evaluation, and shrinking.
     * Effect finalizers run during that interruption.
     *
     * **Gotchas**
     *
     * A timeout cannot preempt a synchronous JavaScript callback that does not return.
     *
     * @since 4.0.0
     */
    prop: <const Arbs extends Arbitraries, A, E>(
      name: string,
      arbitraries: Arbs,
      self: TestFunction<
        A,
        E,
        R,
        [
          {
            [K in keyof Arbs]: ArbitraryValue<Arbs[K]>
          },
          TestContext
        ]
      >,
      timeout?:
        | number
        | TestOptions & {
          arbitrary?: Arbitrary.CheckOptions
        }
    ) => void
  }

  /**
   * @since 4.0.0
   */
  export interface MethodsNonLive<R = never> extends Collector {
    readonly effect: BunTest.Tester<R | Scope.Scope>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2 | Scope.Scope>,
      timeout?: Duration.Input
    ) => Effect.Effect<A, never, R2>
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.Input
    }) => {
      (f: (it: BunTest.MethodsNonLive<R | R2>) => void): void
      (
        name: string,
        f: (it: BunTest.MethodsNonLive<R | R2>) => void
      ): void
    }

    /**
     * Runs a synchronous property test using Schema or Arbitrary inputs.
     *
     * **Details**
     *
     * Returning `false` or throwing falsifies the property and triggers shrinking. A callback that returns normally
     * without returning `false` passes for that generated input.
     *
     * @since 4.0.0
     */
    readonly prop: <const Arbs extends Arbitraries>(
      name: string,
      arbitraries: Arbs,
      self: (
        properties: {
          [K in keyof Arbs]: ArbitraryValue<Arbs[K]>
        },
        ctx: TestContext
      ) => void,
      timeout?:
        | number
        | TestOptions & {
          arbitrary?: Arbitrary.CheckOptions
        }
    ) => void
  }

  /**
   * @since 4.0.0
   */
  export interface Methods<R = never> extends MethodsNonLive<R> {
    readonly live: BunTest.Tester<Scope.Scope | R>
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly memoMap?: Layer.MemoMap
      readonly timeout?: Duration.Input
      readonly excludeTestServices?: boolean
    }) => {
      (f: (it: BunTest.MethodsNonLive<R | R2>) => void): void
      (
        name: string,
        f: (it: BunTest.MethodsNonLive<R | R2>) => void
      ): void
    }
  }
}

/**
 * `bun:test`'s `expect` does not currently expose `addEqualityTesters`, so
 * this is a no-op kept for API parity with `@effect/vitest`. Compare values
 * that implement the `Equal` trait with `Equal.equals` (or the helpers in
 * `@effect/bun-test/utils`) instead.
 *
 * @since 4.0.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 4.0.0
 */
export const effect: BunTest.Tester<Scope.Scope> = internal.effect

/**
 * @since 4.0.0
 */
export const live: BunTest.Tester<Scope.Scope> = internal.live

/**
 * Share a `Layer` between multiple tests, optionally wrapping the tests in a
 * `describe` block if a name is provided.
 *
 * @since 4.0.0
 *
 * ```ts
 * import { assert, layer } from "@effect/bun-test"
 * import { Effect, Layer, Context } from "effect"
 *
 * class Foo extends Context.Service<Foo, "foo">()("Foo") {
 *   static layer = Layer.succeed(Foo, "foo")
 * }
 *
 * layer(Foo.layer)("layer", (it) => {
 *   it.effect("adds context", () =>
 *     Effect.gen(function*() {
 *       const foo = yield* Foo
 *       assert.strictEqual(foo, "foo")
 *     }))
 * })
 * ```
 */
export const layer: <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.Input
    readonly excludeTestServices?: boolean
  }
) => {
  (f: (it: BunTest.MethodsNonLive<R>) => void): void
  (name: string, f: (it: BunTest.MethodsNonLive<R>) => void): void
} = internal.layer

/**
 * @since 4.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R | Scope.Scope>,
  timeout?: Duration.Input
) => Effect.Effect<A, never, R> = internal.flakyTest

/**
 * @since 4.0.0
 */
export const prop: BunTest.Methods["prop"] = internal.prop

/**
 * @since 4.0.0
 */
export const it: BunTest.Methods = internal.makeMethods(internal.defaultApi)

/**
 * @since 4.0.0
 */
export const makeMethods: (it: Collector) => BunTest.Methods = internal.makeMethods

/**
 * @since 4.0.0
 */
export const describeWrapped: (name: string, f: (it: BunTest.Methods) => void) => void = internal.describeWrapped

/**
 * @since 1.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FC from "effect/FastCheck"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"
import * as internal from "./internal/internal.js"

import * as bt from "bun:test"

/**
 * Re-exported primitives from Bun's built-in test runner.
 *
 * Bun (1.2.x) does not currently support `export ... from "bun:test"`, so we
 * re-export each symbol via a const binding.
 *
 * @since 1.0.0
 */
export const afterAll = bt.afterAll
/** @since 1.0.0 */
export const afterEach = bt.afterEach
/** @since 1.0.0 */
export const beforeAll = bt.beforeAll
/** @since 1.0.0 */
export const beforeEach = bt.beforeEach
/** @since 1.0.0 */
export const describe = bt.describe
/** @since 1.0.0 */
export const expect = bt.expect
/** @since 1.0.0 */
export const jest = bt.jest
/** @since 1.0.0 */
export const mock = bt.mock
/** @since 1.0.0 */
export const setSystemTime = bt.setSystemTime
/** @since 1.0.0 */
export const spyOn = bt.spyOn
/** @since 1.0.0 */
export const test = bt.test

/**
 * A minimal stand-in for Vitest's `TestContext`. Bun's test runner doesn't pass
 * a context object to the test function, so this is synthesised from inside
 * the test wrapper.
 *
 * @since 1.0.0
 */
export interface TestContext {
  readonly signal: AbortSignal
  onTestFinished(fn: () => void | Promise<void>): void
  onTestFailed(fn: () => void | Promise<void>): void
}

/**
 * Options accepted by every test registrar in this package.
 *
 * @since 1.0.0
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
 * @since 1.0.0
 */
export type API = TestCollectorCallable

interface TestCollectorCallable {
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
 * @since 1.0.0
 */
export namespace BunTest {
  /**
   * @since 1.0.0
   */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /**
   * @since 1.0.0
   */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, [TestContext]>,
      timeout?: number | TestOptions
    ): void
  }

  /**
   * @since 1.0.0
   */
  export type Arbitraries =
    | Array<Schema.Schema.Any | FC.Arbitrary<any>>
    | { [K in string]: Schema.Schema.Any | FC.Arbitrary<any> }

  /**
   * @since 1.0.0
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
     * @since 1.0.0
     */
    prop: <const Arbs extends Arbitraries, A, E>(
      name: string,
      arbitraries: Arbs,
      self: TestFunction<
        A,
        E,
        R,
        [
          { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> },
          TestContext
        ]
      >,
      timeout?:
        | number
        | TestOptions & {
          fastCheck?: FC.Parameters<
            { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
          >
        }
    ) => void
  }

  /**
   * @since 1.0.0
   */
  export interface MethodsNonLive<R = never, ExcludeTestServices extends boolean = false> extends API {
    readonly effect: BunTest.Tester<(ExcludeTestServices extends true ? never : TestServices.TestServices) | R>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>
    readonly scoped: BunTest.Tester<
      (ExcludeTestServices extends true ? never : TestServices.TestServices) | Scope.Scope | R
    >
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) => {
      (f: (it: BunTest.MethodsNonLive<R | R2, ExcludeTestServices>) => void): void
      (
        name: string,
        f: (it: BunTest.MethodsNonLive<R | R2, ExcludeTestServices>) => void
      ): void
    }

    /**
     * @since 1.0.0
     */
    readonly prop: <const Arbs extends Arbitraries>(
      name: string,
      arbitraries: Arbs,
      self: (
        properties: { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> },
        ctx: TestContext
      ) => void,
      timeout?:
        | number
        | TestOptions & {
          fastCheck?: FC.Parameters<
            { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
          >
        }
    ) => void
  }

  /**
   * @since 1.0.0
   */
  export interface Methods<R = never> extends MethodsNonLive<R> {
    readonly live: BunTest.Tester<R>
    readonly scopedLive: BunTest.Tester<Scope.Scope | R>
  }
}

/**
 * `bun:test`'s `expect` does not currently expose `addEqualityTesters`, so this
 * is a no-op kept for API parity with `@effect/vitest`. Compare values that
 * implement the `Equal` trait with `Equal.equals` (or the helpers in
 * `@effect/bun-test/utils`) instead.
 *
 * @since 1.0.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 1.0.0
 */
export const effect: BunTest.Tester<TestServices.TestServices> = internal.effect

/**
 * @since 1.0.0
 */
export const scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope> = internal.scoped

/**
 * @since 1.0.0
 */
export const live: BunTest.Tester<never> = internal.live

/**
 * @since 1.0.0
 */
export const scopedLive: BunTest.Tester<Scope.Scope> = internal.scopedLive

/**
 * Share a `Layer` between multiple tests, optionally wrapping the tests in a
 * `describe` block if a name is provided.
 *
 * @since 1.0.0
 */
export const layer: <R, E, const ExcludeTestServices extends boolean = false>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
    readonly excludeTestServices?: ExcludeTestServices
  }
) => {
  (f: (it: BunTest.MethodsNonLive<R, ExcludeTestServices>) => void): void
  (name: string, f: (it: BunTest.MethodsNonLive<R, ExcludeTestServices>) => void): void
} = internal.layer

/**
 * @since 1.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R> = internal.flakyTest

/**
 * @since 1.0.0
 */
export const prop: BunTest.Methods["prop"] = internal.prop

/** @ignored */
const methods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const

/**
 * @since 1.0.0
 */
export const it: BunTest.Methods = Object.assign(internal.defaultApi, methods)

/**
 * @since 1.0.0
 */
export const makeMethods: (it: API) => BunTest.Methods = internal.makeMethods

/**
 * @since 1.0.0
 */
export const describeWrapped: (name: string, f: (it: BunTest.Methods) => void) => void = internal.describeWrapped

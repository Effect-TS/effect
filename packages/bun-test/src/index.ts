/**
 * @since 1.0.0
 */
import * as Core from "@effect/test"
import { describe, test as bunTest } from "bun:test"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FC from "effect/FastCheck"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"
import { bunAdapter } from "./internal/adapter.js"

/**
 * @since 1.0.0
 */
export { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn } from "bun:test"

/**
 * @since 1.0.0
 */
export interface TestContext {}

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
      timeout?: number | Core.TestOptions
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
    ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | Core.TestOptions) => void
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
        | Core.TestOptions
    ) => void
  }

  /**
   * @since 1.0.0
   */
  export interface MethodsNonLive<R = never, ExcludeTestServices extends boolean = false> {
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
      timeout?: number | Core.TestOptions
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

// Create a minimal API object for Bun
// Note: We wrap bunTest in a new function because Bun's test export is readonly/frozen
const bunApi: Core.API<TestContext> = Object.assign(
  ((name: string, fn?: () => void | Promise<void>, options?: { timeout?: number }) =>
    bunTest(name, fn ?? (() => {}), options)) as Core.API<TestContext>,
  {
    skip: (name: string, fn?: () => void | Promise<void>) => bunTest.skip(name, fn ?? (() => {})),
    only: (name: string, fn?: () => void | Promise<void>) => bunTest.only(name, fn ?? (() => {})),
    skipIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>) =>
      bunTest.skipIf(condition as boolean)(name, fn ?? (() => {})),
    runIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>) =>
      bunTest.if(condition as boolean)(name, fn ?? (() => {})),
    fails: (name: string, fn?: () => void | Promise<void>) => bunTest.todo(name, fn ?? (() => {})),
    for:
      <T>(cases: ReadonlyArray<T>) =>
      (name: string, _options: Core.TestOptions, fn: (args: T, ctx: TestContext) => void | Promise<void>) =>
        bunTest.each(cases as Array<T>)(name, (args) => fn(args, {}))
  }
)

const methods = Core.makeMethods<TestContext, Record<string, never>>(bunAdapter, bunApi)

/**
 * @since 1.0.0
 */
export const effect: BunTest.Tester<TestServices.TestServices> = methods.effect as BunTest.Tester<
  TestServices.TestServices
>

/**
 * @since 1.0.0
 */
export const scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope> = methods.scoped as BunTest.Tester<
  TestServices.TestServices | Scope.Scope
>

/**
 * @since 1.0.0
 */
export const live: BunTest.Tester<never> = methods.live as BunTest.Tester<never>

/**
 * @since 1.0.0
 */
export const scopedLive: BunTest.Tester<Scope.Scope> = methods.scopedLive as BunTest.Tester<Scope.Scope>

/**
 * Share a `Layer` between multiple tests, optionally wrapping
 * the tests in a `describe` block if a name is provided.
 *
 * @since 1.0.0
 *
 * ```ts
 * import { expect, layer } from "@effect/bun-test"
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
} = Core.layer<TestContext, Record<string, never>>(bunAdapter, bunApi) as any

/**
 * @since 1.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R> = Core.flakyTest

/**
 * @since 1.0.0
 */
export const prop: BunTest.Methods["prop"] = methods.prop as BunTest.Methods["prop"]

/** @ignored */
const testMethods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const

/**
 * @since 1.0.0
 */
export const it: BunTest.Methods = Object.assign(
  ((name: string, fn?: () => void | Promise<void>, options?: { timeout?: number }) =>
    // Cast through unknown because the wrapper function signature doesn't match BunTest.Methods,
    // but Object.assign will add all the required methods from testMethods
    bunTest(name, fn ?? (() => {}), options)) as unknown as BunTest.Methods,
  testMethods
)

/**
 * @since 1.0.0
 */
export const test: BunTest.Methods = it

/**
 * @since 1.0.0
 */
export const describeWrapped = (name: string, f: (it: BunTest.Methods) => void) => describe(name, () => f(it))

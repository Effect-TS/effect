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
import * as V from "vitest"
import * as internal from "./internal/internal.js"

/**
 * @since 1.0.0
 */
export * from "vitest"

/**
 * @since 1.0.0
 */
export type API =
  & { scopedFixtures: V.TestAPI<{}>["scoped"] }
  & { [K in keyof V.TestAPI<{}>]: K extends "scoped" ? unknown : V.TestAPI<{}>[K] }
  & TestCollectorCallable

interface TestCollectorCallable<C = object> {
  /**
   * @deprecated Use options as the second argument instead
   */
  <ExtraContext extends C>(
    name: string | Function,
    fn: V.TestFunction<ExtraContext>,
    options: TestCollectorOptions
  ): void
  <ExtraContext extends C>(
    name: string | Function,
    fn?: V.TestFunction<ExtraContext>,
    options?: number | TestCollectorOptions
  ): void
  <ExtraContext extends C>(
    name: string | Function,
    options?: TestCollectorOptions,
    fn?: V.TestFunction<ExtraContext>
  ): void
}

type TestCollectorOptions = {
  concurrent?: boolean
  sequential?: boolean
  only?: boolean
  skip?: boolean
  todo?: boolean
  fails?: boolean
  timeout?: number
  retry?: number
  repeats?: number
}

/**
 * @since 1.0.0
 */
export namespace Vitest {
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
      self: TestFunction<A, E, R, [V.TestContext]>,
      timeout?: number | V.TestOptions
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
  export interface Tester<R> extends Vitest.Test<R> {
    /**
     * Prints the name of the test when running the suite, but doesn't run it
     */
    skip: Vitest.Test<R>
    /**
     * Ignores a test if a certain condition is met (for example you might want to skip tests depending on the environment)
     */
    skipIf: (condition: unknown) => Vitest.Test<R>
    /**
     * Only runs a test if a certain condition is met
     */
    runIf: (condition: unknown) => Vitest.Test<R>
    /**
     * Only runs tests marked with `.only` and ignores the rest
     */
    only: Vitest.Test<R>
    /**
     * Use test.each when you need to run the same test with different variables. You can inject parameters with printf formatting in the test name in the order of the test function parameters.
     * - %s: string
     * - %d: number
     * - %i: integer
     * - %f: floating point value
     * - %j: json
     * - %o: object
     * - %#: 0-based index of the test case
     * - %$: 1-based index of the test case
     * - %%: single percent sign ('%')
     * @see https://vitest.dev/api/#test-each
     */
    each: <Case>(
      cases: ReadonlyArray<Case>
    ) => <A, E>(
      name: string,
      self: TestFunction<A, E, R, Case extends ReadonlyArray<any> ? [...Case] : [Case]>,
      timeout?: number | V.TestOptions
    ) => void

    /**
     * The same as `.each`, but is specific to vitest and allows accessing the context and doesn't spread nested arrays in the arguments.
     * @see https://vitest.dev/api/#test-for
     */
    for: <Case>(
      cases: ReadonlyArray<Case>
    ) => <A, E>(
      name: string,
      self: TestFunction<A, E, R, [Case, V.TestContext]>,
      timeout?: number | V.TestOptions
    ) => void

    /**
     * Inverts the test result (success becomes failure and failure becomes success). Or in other words, expects the test to fail.
     */
    fails: Vitest.Test<R>

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
          V.TestContext
        ]
      >,
      timeout?:
        | number
        | V.TestOptions & {
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
    readonly effect: Vitest.Tester<(ExcludeTestServices extends true ? never : TestServices.TestServices) | R>

    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>
    readonly scoped: Vitest.Tester<
      (ExcludeTestServices extends true ? never : TestServices.TestServices) | Scope.Scope | R
    >
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) => {
      (f: (it: Vitest.MethodsNonLive<R | R2, ExcludeTestServices>) => void): void
      (
        name: string,
        f: (it: Vitest.MethodsNonLive<R | R2, ExcludeTestServices>) => void
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
        ctx: V.TestContext
      ) => void,
      timeout?:
        | number
        | V.TestOptions & {
          fastCheck?: FC.Parameters<
            { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
          >
        }
    ) => void
  }

  /**
   * @since 1.1.0
   */
  export interface LiveMethods<R = never> extends MethodsNonLive<R> {
    readonly live: Vitest.Tester<R>
    readonly scopedLive: Vitest.Tester<Scope.Scope | R>
  }

  // We can't use the plain Omit from typescript because it doesn't take into account Function types
  // and erases the Function type from the parameter instead of keeping it
  type FixedOmit<T, K extends PropertyKey> =
    & (T extends (...args: infer A) => infer R ? (...args: A) => R : unknown)
    & Omit<T, K>
  type RemoveConcurrent<T> = FixedOmit<T, "concurrent">

  /**
   * @since 1.0.0
   */
  export type Methods<R = never> =
    & TestCollectorCallable
    & Omit<LiveMethods<R>, "effect" | "live" | "scopedLive" | "scoped">
    & {
      readonly effect: RemoveConcurrent<LiveMethods<R>["effect"]> & {
        /**
         * @since 1.1.0
         */
        readonly concurrent: LiveMethods<R>["effect"]
      }
      readonly live: RemoveConcurrent<LiveMethods<R>["live"]> & {
        /**
         * @since 1.1.0
         */
        readonly concurrent: LiveMethods<R>["live"]
      }
      readonly scoped: RemoveConcurrent<LiveMethods<R>["scoped"]> & {
        /**
         * @since 1.1.0
         */
        readonly concurrent: LiveMethods<R>["scoped"]
      }
      readonly scopedLive: RemoveConcurrent<LiveMethods<R>["scopedLive"]> & {
        /**
         * @since 1.1.0
         */
        readonly concurrent: LiveMethods<R>["scopedLive"]
      }
    }
}

/**
 * @since 1.0.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 1.0.0
 */
export const effect: Vitest.Methods["effect"] = internal.effect

/**
 * @since 1.0.0
 */
export const scoped: Vitest.Methods["scoped"] = internal.scoped

/**
 * @since 1.0.0
 */
export const live: Vitest.Methods["live"] = internal.live

/**
 * @since 1.0.0
 */
export const scopedLive: Vitest.Methods["scopedLive"] = internal.scopedLive

/**
 * Share a `Layer` between multiple tests, optionally wrapping
 * the tests in a `describe` block if a name is provided.
 *
 * @since 1.0.0
 *
 * ```ts
 * import { expect, layer } from "@effect/vitest"
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
  (f: (it: Vitest.MethodsNonLive<R, ExcludeTestServices>) => void): void
  (name: string, f: (it: Vitest.MethodsNonLive<R, ExcludeTestServices>) => void): void
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
export const prop: Vitest.Methods["prop"] = internal.prop

/**
 * @since 1.0.0
 */

/** @ignored */
const methods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const
/**
 * @since 1.0.0
 */
export const it: Vitest.Methods = Object.assign(V.it, {
  ...methods,
  scopedFixtures: V.it.scoped.bind(V.it)
})
/**
 * @since 1.0.0
 */
export const makeMethods: (it: API) => Vitest.Methods = internal.makeMethods

/**
 * @since 1.0.0
 */
export const describeWrapped: (name: string, f: (it: Vitest.Methods) => void) => V.SuiteCollector =
  internal.describeWrapped

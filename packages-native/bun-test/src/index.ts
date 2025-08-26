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

/**
 * @since 0.1.0
 */
export * from "bun:test"

/**
 * @since 0.1.0
 */
export namespace BunTest {
  /**
   * @since 0.1.0
   */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /**
   * @since 0.1.0
   */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, []>,
      timeout?: number
    ): void
  }

  /**
   * @since 0.1.0
   */
  export type Arbitraries =
    | Array<Schema.Schema.Any | FC.Arbitrary<any>>
    | { [K in string]: Schema.Schema.Any | FC.Arbitrary<any> }

  /**
   * @since 0.1.0
   */
  export interface Tester<R> extends BunTest.Test<R> {
    skip: BunTest.Test<R>
    skipIf: (condition: unknown) => BunTest.Test<R>
    runIf: (condition: unknown) => BunTest.Test<R>
    only: BunTest.Test<R>
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, [T]>, timeout?: number) => void
    failing: BunTest.Test<R>
    todo: BunTest.Test<R>

    /**
     * @since 0.1.0
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
   * @since 0.1.0
   */
  export interface Methods<R = never> {
    readonly effect: BunTest.Tester<TestServices.TestServices | R>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>
    readonly scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope | R>
    readonly live: BunTest.Tester<R>
    readonly scopedLive: BunTest.Tester<Scope.Scope | R>
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) => {
      (f: (it: BunTest.Methods<R | R2>) => void): void
      (name: string, f: (it: BunTest.Methods<R | R2>) => void): void
    }

    /**
     * @since 0.1.0
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
 * @since 0.1.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 0.1.0
 */
export const effect: BunTest.Tester<TestServices.TestServices> = internal.effect

/**
 * @since 0.1.0
 */
export const scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope> = internal.scoped

/**
 * @since 0.1.0
 */
export const live: BunTest.Tester<never> = internal.live

/**
 * @since 0.1.0
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
 * @since 0.1.0
 */
export const flakyTest = internal.flakyTest

/**
 * @since 0.1.0
 */
export const prop: BunTest.Methods["prop"] = internal.prop

/**
 * @since 0.1.0
 */
const methods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const

/**
 * @since 0.1.0
 */
export const it = Object.assign(B.test, methods) as any as BunTest.Methods

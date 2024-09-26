/**
 * @since 1.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"
import * as V from "vitest"
import * as internal from "./internal.js"

/**
 * @since 1.0.0
 */
export type API = V.TestAPI<{}>

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
      self: TestFunction<A, E, R, [V.TaskContext<V.RunnerTestCase<{}>> & V.TestContext]>,
      timeout?: number | V.TestOptions
    ): void
  }

  /**
   * @since 1.0.0
   */
  export interface Tester<R> extends Vitest.Test<R> {
    skip: Vitest.Test<R>
    skipIf: (condition: unknown) => Vitest.Test<R>
    runIf: (condition: unknown) => Vitest.Test<R>
    only: Vitest.Test<R>
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | V.TestOptions) => void
  }

  /**
   * @since 1.0.0
   */
  export interface Methods<R = never> extends API {
    readonly effect: Vitest.Tester<TestServices.TestServices | R>
    readonly live: Vitest.Tester<R>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.DurationInput
    ) => Effect.Effect<A, never, R2>
    readonly scoped: Vitest.Tester<TestServices.TestServices | Scope.Scope | R>
    readonly scopedLive: Vitest.Tester<Scope.Scope | R>
    readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>) => {
      (f: (it: Vitest.Methods<R | R2>) => void): void
      (name: string, f: (it: Vitest.Methods<R | R2>) => void): void
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
export const effect: Vitest.Tester<TestServices.TestServices> = internal.effect

/**
 * @since 1.0.0
 */
export const scoped: Vitest.Tester<TestServices.TestServices | Scope.Scope> = internal.scoped

/**
 * @since 1.0.0
 */
export const live: Vitest.Tester<never> = internal.live

/**
 * @since 1.0.0
 */
export const scopedLive: Vitest.Tester<Scope.Scope> = internal.scopedLive

/**
 * @since 1.0.0
 */
export const layer: <R, E>(
  layer_: Layer.Layer<R, E>,
  memoMap?: Layer.MemoMap
) => {
  (f: (it: Vitest.Methods<R>) => void): void
  (name: string, f: (it: Vitest.Methods<R>) => void): void
} = internal.layer

/**
 * @since 1.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R> = internal.flakyTest

/** @ignored */
const methods = { effect, live, flakyTest, scoped, scopedLive, layer } as const

/**
 * @since 1.0.0
 */
export const it: Vitest.Methods = Object.assign(V.it, methods)

/**
 * @since 1.0.0
 */
export * from "vitest"

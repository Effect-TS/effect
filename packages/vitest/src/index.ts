/**
 * @since 1.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
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
}

/**
 * @since 1.0.0
 */
export const addEqualityTesters: () => void = internal.addEqualityTesters

/**
 * @since 1.1.0
 */
export const beforeAllEffect: <E>(
  self: (
    suite: Readonly<V.RunnerTestSuite | V.RunnerTestFile>
  ) => Effect.Effect<V.HookCleanupCallback | PromiseLike<V.HookCleanupCallback>, E, never>,
  timeout?: number
) => void = internal.beforeAll

/**
 * @since 1.1.0
 */
export const beforeEachEffect: <E>(
  self: (
    ctx: V.TaskContext<V.RunnerCustomCase<object> | V.RunnerTestCase<object>> & V.TestContext & object,
    suite: V.RunnerTestSuite
  ) => Effect.Effect<V.HookCleanupCallback | PromiseLike<V.HookCleanupCallback>, E, never>,
  timeout?: number
) => void = internal.beforeEach

/**
 * @since 1.1.0
 */
export const afterAllEffect: <E>(
  self: (suite: Readonly<V.RunnerTestSuite | V.RunnerTestFile>) => Effect.Effect<void | PromiseLike<void>, E, never>,
  timeout?: number
) => void = internal.afterAll

/**
 * @since 1.1.0
 */
export const afterEachEffect: <E>(
  self: (
    ctx: V.TaskContext<V.RunnerCustomCase<object> | V.RunnerTestCase<object>> & V.TestContext & object,
    suite: V.RunnerTestSuite
  ) => Effect.Effect<void | PromiseLike<void>, E, never>,
  timeout?: number
) => void = internal.afterEach

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
 * @since 1.1.0
 */
export const withManagedRuntime: <R, ER>(
  managedRuntime: ManagedRuntime.ManagedRuntime<R, ER>
) => Vitest.Tester<R> = internal.withManagedRuntime

/**
 * @since 1.0.0
 */
export const flakyTest: <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R> = internal.flakyTest

/** @ignored */
const methods = {
  effect,
  live,
  flakyTest,
  scoped,
  scopedLive,
  beforeAllEffect,
  beforeEachEffect,
  afterAllEffect,
  afterEachEffect,
  withManagedRuntime
} as const

/**
 * @since 1.0.0
 */
export const it: API & typeof methods = Object.assign(V.it, methods)

/**
 * @since 1.0.0
 */
export * from "vitest"

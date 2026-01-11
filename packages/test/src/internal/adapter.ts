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

/**
 * Internal context used by the test runner for cleanup and cancellation.
 * @since 1.0.0
 */
export interface TestContext {
  /** AbortSignal for test timeout/cancellation (optional - not all runners support) */
  readonly signal?: AbortSignal
  /** Register cleanup to run after this specific test */
  readonly onTestFinished?: (fn: () => Promise<void>) => void
}

/**
 * @since 1.0.0
 */
export interface TestOptions {
  readonly timeout?: number
  readonly retry?: number
  readonly repeats?: number
  readonly concurrent?: boolean
  readonly sequential?: boolean
  readonly fails?: boolean
  readonly fastCheck?: FC.Parameters<any>
}

/**
 * Function signature for a test implementation.
 * Receives both internal context (for cleanup) and runner context (passed to test function).
 * @since 1.0.0
 */
export interface TestFn<TRunnerContext> {
  (internalCtx: TestContext, runnerCtx: TRunnerContext): Promise<void>
}

/**
 * Core test registration function
 * @since 1.0.0
 */
export interface TestRegister<TRunnerContext> {
  (name: string, fn: TestFn<TRunnerContext>, options?: TestOptions): void
}

/**
 * Parameterized test helper
 * @since 1.0.0
 */
export interface TestEach<TRunnerContext> {
  <T>(cases: ReadonlyArray<T>): (
    name: string,
    fn: (args: T, internalCtx: TestContext, runnerCtx: TRunnerContext) => Promise<void>,
    options?: TestOptions
  ) => void
}

/**
 * Adapter interface that test runners must implement
 * @since 1.0.0
 */
export interface TestRunnerAdapter<TRunnerContext> {
  readonly test: TestRegister<TRunnerContext> & {
    readonly skip: TestRegister<TRunnerContext>
    readonly only: TestRegister<TRunnerContext>
    readonly skipIf: (condition: unknown) => TestRegister<TRunnerContext>
    readonly runIf: (condition: unknown) => TestRegister<TRunnerContext>
    readonly fails: TestRegister<TRunnerContext>
    readonly each: TestEach<TRunnerContext>
  }

  readonly describe: (name: string, fn: () => void) => void

  readonly beforeAll: (fn: () => Promise<void>, timeout?: number) => void
  readonly afterAll: (fn: () => Promise<void>, timeout?: number) => void
  readonly beforeEach: (fn: () => Promise<void>, timeout?: number) => void
  readonly afterEach: (fn: () => Promise<void>, timeout?: number) => void

  /** Add custom equality testers for Effect's Equal trait */
  readonly addEqualityTesters?: (testers: Array<unknown>) => void
}

/**
 * @since 1.0.0
 */
export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
  (...args: TestArgs): Effect.Effect<A, E, R>
}

/**
 * @since 1.0.0
 */
export interface Test<R, TContext> {
  <A, E>(
    name: string,
    self: TestFunction<A, E, R, [TContext]>,
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
export interface Tester<R, TContext> extends Test<R, TContext> {
  skip: Test<R, TContext>
  skipIf: (condition: unknown) => Test<R, TContext>
  runIf: (condition: unknown) => Test<R, TContext>
  only: Test<R, TContext>
  each: <T>(
    cases: ReadonlyArray<T>
  ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | TestOptions) => void
  fails: Test<R, TContext>

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
        TContext
      ]
    >,
    timeout?:
      | number
      | TestOptions
  ) => void
}

/**
 * Base API interface that adapters provide
 * @since 1.0.0
 */
export interface API<TContext> {
  /**
   * @deprecated Use options as the second argument instead
   */
  <ExtraContext extends object>(
    name: string | Function,
    fn: (ctx: ExtraContext) => void | Promise<void>,
    options: TestOptions
  ): void
  <ExtraContext extends object>(
    name: string | Function,
    fn?: (ctx: ExtraContext) => void | Promise<void>,
    options?: number | TestOptions
  ): void
  <ExtraContext extends object>(
    name: string | Function,
    options?: TestOptions,
    fn?: (ctx: ExtraContext) => void | Promise<void>
  ): void

  skip: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  only: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  skipIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  runIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  fails: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  for: <T>(cases: ReadonlyArray<T>) => (
    name: string,
    options: TestOptions,
    fn: (args: T, ctx: TContext) => void | Promise<void>
  ) => void
}

/**
 * @since 1.0.0
 */
export interface MethodsNonLive<R, TContext, ExcludeTestServices extends boolean = false> {
  readonly effect: Tester<(ExcludeTestServices extends true ? never : TestServices.TestServices) | R, TContext>
  readonly flakyTest: <A, E, R2>(
    self: Effect.Effect<A, E, R2>,
    timeout?: Duration.DurationInput
  ) => Effect.Effect<A, never, R2>
  readonly scoped: Tester<
    (ExcludeTestServices extends true ? never : TestServices.TestServices) | Scope.Scope | R,
    TContext
  >
  readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
    readonly timeout?: Duration.DurationInput
  }) => {
    (f: (it: MethodsNonLive<R | R2, TContext, ExcludeTestServices>) => void): void
    (
      name: string,
      f: (it: MethodsNonLive<R | R2, TContext, ExcludeTestServices>) => void
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
      ctx: TContext
    ) => void,
    timeout?: number | TestOptions
  ) => void
}

/**
 * @since 1.0.0
 */
export interface Methods<R, TContext> extends MethodsNonLive<R, TContext> {
  readonly live: Tester<R, TContext>
  readonly scopedLive: Tester<Scope.Scope | R, TContext>
}
